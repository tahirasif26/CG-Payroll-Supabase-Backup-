-- ═══════════════════════════════════════════════════
-- APPROVAL GROUPS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.approval_groups (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  max_limit_halalas     bigint,
  approval_type         text NOT NULL DEFAULT 'any_one'
                        CHECK (approval_type IN ('any_one', 'all_must', 'majority')),
  escalate_after_days   int,
  escalate_to_group_id  uuid REFERENCES public.approval_groups(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);

ALTER TABLE public.approval_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client members read approval_groups"
  ON public.approval_groups FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "client admins manage approval_groups"
  ON public.approval_groups FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE TRIGGER update_approval_groups_updated_at
  BEFORE UPDATE ON public.approval_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════
-- APPROVAL GROUP MEMBERS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.approval_group_members (
  group_id    uuid NOT NULL REFERENCES public.approval_groups(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, employee_id)
);

ALTER TABLE public.approval_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client members read approval_group_members"
  ON public.approval_group_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.approval_groups ag
      WHERE ag.id = group_id
      AND ag.client_id = public.get_user_client_id(auth.uid())
    )
  );

CREATE POLICY "client admins manage approval_group_members"
  ON public.approval_group_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.approval_groups ag
      WHERE ag.id = group_id
      AND public.is_admin_or_hr_in_client(auth.uid(), ag.client_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.approval_groups ag
      WHERE ag.id = group_id
      AND public.is_admin_or_hr_in_client(auth.uid(), ag.client_id)
    )
  );

-- ═══════════════════════════════════════════════════
-- APPROVAL POLICIES (routing rules)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.approval_policies (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category               text NOT NULL,
  min_value              bigint NOT NULL DEFAULT 0,
  max_value              bigint,
  group_id               uuid REFERENCES public.approval_groups(id) ON DELETE SET NULL,
  approval_type_override text CHECK (approval_type_override IN ('any_one', 'all_must', 'majority')),
  sort_order             int NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client members read approval_policies"
  ON public.approval_policies FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "client admins manage approval_policies"
  ON public.approval_policies FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE INDEX IF NOT EXISTS idx_approval_policies_lookup
  ON public.approval_policies (client_id, category, sort_order, min_value);

-- ═══════════════════════════════════════════════════
-- APPROVAL DELEGATIONS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.approval_delegations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  from_employee_id   uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  to_employee_id     uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date         date NOT NULL,
  end_date           date NOT NULL,
  is_active          boolean NOT NULL DEFAULT true,
  created_by         uuid REFERENCES public.profiles(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (from_employee_id <> to_employee_id),
  CHECK (end_date >= start_date)
);

ALTER TABLE public.approval_delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client members read delegations"
  ON public.approval_delegations FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "client admins manage delegations"
  ON public.approval_delegations FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE INDEX IF NOT EXISTS idx_approval_delegations_active
  ON public.approval_delegations (from_employee_id, is_active, start_date, end_date);

-- ═══════════════════════════════════════════════════
-- FUNCTION: resolve approver group for a request
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.resolve_approval_group(
  _client_id uuid,
  _category  text,
  _value     bigint DEFAULT 0
)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT group_id
  FROM public.approval_policies
  WHERE client_id = _client_id
    AND category = _category
    AND min_value <= _value
    AND (max_value IS NULL OR max_value >= _value)
  ORDER BY sort_order, min_value
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_approval_group(uuid, text, bigint) TO authenticated, service_role;

-- ═══════════════════════════════════════════════════
-- FUNCTION: get active approvers (with delegation)
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_active_approvers(_group_id uuid)
RETURNS TABLE(employee_id uuid, via_delegation boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(ad.to_employee_id, agm.employee_id) AS employee_id,
    ad.id IS NOT NULL AS via_delegation
  FROM public.approval_group_members agm
  LEFT JOIN public.approval_delegations ad
    ON ad.from_employee_id = agm.employee_id
    AND ad.is_active = true
    AND ad.start_date <= CURRENT_DATE
    AND ad.end_date >= CURRENT_DATE
  WHERE agm.group_id = _group_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_approvers(uuid) TO authenticated, service_role;