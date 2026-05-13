-- 1. Approval groups: description + active flag
ALTER TABLE public.approval_groups
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Approval policies: type + active flag
ALTER TABLE public.approval_policies
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS policy_type text NOT NULL DEFAULT 'range'
    CHECK (policy_type IN ('range','fixed'));

-- 3. Delegations: fallback approver + reason
ALTER TABLE public.approval_delegations
  ADD COLUMN IF NOT EXISTS fallback_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reason text;

-- 4. Multi-level policy chain
CREATE TABLE IF NOT EXISTS public.approval_policy_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.approval_policies(id) ON DELETE CASCADE,
  level_order integer NOT NULL,
  group_id uuid REFERENCES public.approval_groups(id) ON DELETE SET NULL,
  mode text NOT NULL DEFAULT 'sequential' CHECK (mode IN ('sequential','parallel')),
  sla_hours integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_id, level_order)
);
CREATE INDEX IF NOT EXISTS idx_policy_levels_policy ON public.approval_policy_levels(policy_id, level_order);

ALTER TABLE public.approval_policy_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read policy_levels" ON public.approval_policy_levels;
CREATE POLICY "members read policy_levels" ON public.approval_policy_levels
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.approval_policies p
    WHERE p.id = approval_policy_levels.policy_id
      AND p.client_id = public.get_user_client_id(auth.uid())
  ));

DROP POLICY IF EXISTS "admins manage policy_levels" ON public.approval_policy_levels;
CREATE POLICY "admins manage policy_levels" ON public.approval_policy_levels
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.approval_policies p
    WHERE p.id = approval_policy_levels.policy_id
      AND public.is_admin_or_hr_in_client(auth.uid(), p.client_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.approval_policies p
    WHERE p.id = approval_policy_levels.policy_id
      AND public.is_admin_or_hr_in_client(auth.uid(), p.client_id)
  ));

-- 5. Workflow logs (audit trail)
CREATE TABLE IF NOT EXISTS public.workflow_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_state text,
  to_state text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_client ON public.workflow_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_entity ON public.workflow_logs(entity_type, entity_id);

ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read workflow_logs" ON public.workflow_logs;
CREATE POLICY "members read workflow_logs" ON public.workflow_logs
  FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

DROP POLICY IF EXISTS "members insert workflow_logs" ON public.workflow_logs;
CREATE POLICY "members insert workflow_logs" ON public.workflow_logs
  FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id(auth.uid()));

-- 6. Auto-expire delegations function (callable manually or by cron)
CREATE OR REPLACE FUNCTION public.expire_approval_delegations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.approval_delegations
     SET is_active = false
   WHERE is_active = true
     AND end_date < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_approval_delegations() TO authenticated;

-- 7. Realtime publication
ALTER TABLE public.approval_groups        REPLICA IDENTITY FULL;
ALTER TABLE public.approval_policies      REPLICA IDENTITY FULL;
ALTER TABLE public.approval_policy_levels REPLICA IDENTITY FULL;
ALTER TABLE public.approval_delegations   REPLICA IDENTITY FULL;
ALTER TABLE public.workflow_logs          REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_groups;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_policies;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_policy_levels;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_delegations;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_logs;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;