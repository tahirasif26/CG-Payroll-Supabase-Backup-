
-- ============================================================
-- Unified Request & Approval Workflow Engine
-- ============================================================

-- 1. Tables -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.request_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  module text NOT NULL,                    -- 'expense' | 'advance' | 'loan' | 'leave' | 'asset'
  entity_id uuid NOT NULL,                 -- FK to expenses.id / advances.id / loans.id / leave_requests.id / asset_requests.id
  requester_employee_id uuid NOT NULL,
  policy_id uuid,
  value_amount bigint NOT NULL DEFAULT 0,  -- halalas (money) or days (leave)
  value_unit text NOT NULL DEFAULT 'halalas',
  current_level int NOT NULL DEFAULT 1,
  current_group_id uuid,
  status text NOT NULL DEFAULT 'pending',  -- pending|approved|rejected|paid|unpaid|delivered
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_req_appr_client ON public.request_approvals(client_id);
CREATE INDEX IF NOT EXISTS idx_req_appr_requester ON public.request_approvals(requester_employee_id);
CREATE INDEX IF NOT EXISTS idx_req_appr_status ON public.request_approvals(client_id, status);

CREATE TABLE IF NOT EXISTS public.request_approval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_approval_id uuid NOT NULL REFERENCES public.request_approvals(id) ON DELETE CASCADE,
  level_order int,
  action text NOT NULL,                    -- submitted|approved|rejected|delegated|escalated|paid|unpaid|delivered|reassigned|comment
  actor_user_id uuid,
  actor_employee_id uuid,
  on_behalf_of_employee_id uuid,
  group_id uuid,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rah_request ON public.request_approval_history(request_approval_id, created_at);

CREATE TABLE IF NOT EXISTS public.request_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_approval_id uuid NOT NULL REFERENCES public.request_approvals(id) ON DELETE CASCADE,
  level_order int NOT NULL DEFAULT 1,
  group_id uuid,
  employee_id uuid NOT NULL,
  via_delegation boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',  -- pending|acted|skipped
  acted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ra_request ON public.request_assignments(request_approval_id);
CREATE INDEX IF NOT EXISTS idx_ra_employee_pending ON public.request_assignments(employee_id, status);

CREATE TABLE IF NOT EXISTS public.payroll_payment_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  request_approval_id uuid NOT NULL REFERENCES public.request_approvals(id) ON DELETE CASCADE,
  module text NOT NULL,                    -- 'expense' | 'advance' | 'loan'
  entity_id uuid NOT NULL,
  amount bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  payroll_run_id uuid,
  paid_at timestamptz,
  paid_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_approval_id)
);

CREATE INDEX IF NOT EXISTS idx_pps_client_unpaid ON public.payroll_payment_status(client_id) WHERE paid_at IS NULL;

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_req_appr_updated ON public.request_approvals;
CREATE TRIGGER trg_req_appr_updated BEFORE UPDATE ON public.request_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pps_updated ON public.payroll_payment_status;
CREATE TRIGGER trg_pps_updated BEFORE UPDATE ON public.payroll_payment_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. RLS ----------------------------------------------------------------

ALTER TABLE public.request_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_payment_status ENABLE ROW LEVEL SECURITY;

-- security-definer helper used by RLS and UI
CREATE OR REPLACE FUNCTION public.can_act_on_request(_user_id uuid, _request_approval_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
BEGIN
  SELECT client_id INTO v_client FROM public.request_approvals WHERE id = _request_approval_id;
  IF v_client IS NULL THEN RETURN false; END IF;
  IF public.is_super_admin(_user_id) THEN RETURN true; END IF;
  IF public.is_admin_or_hr_in_client(_user_id, v_client) THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.request_assignments ra
    JOIN public.employees e ON e.id = ra.employee_id
    WHERE ra.request_approval_id = _request_approval_id
      AND ra.status = 'pending'
      AND e.user_id = _user_id
  );
END;
$$;

-- request_approvals
DROP POLICY IF EXISTS req_appr_super ON public.request_approvals;
CREATE POLICY req_appr_super ON public.request_approvals
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS req_appr_admin ON public.request_approvals;
CREATE POLICY req_appr_admin ON public.request_approvals
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

DROP POLICY IF EXISTS req_appr_requester_select ON public.request_approvals;
CREATE POLICY req_appr_requester_select ON public.request_approvals
  FOR SELECT TO authenticated
  USING (requester_employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS req_appr_requester_insert ON public.request_approvals;
CREATE POLICY req_appr_requester_insert ON public.request_approvals
  FOR INSERT TO authenticated
  WITH CHECK (requester_employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS req_appr_approver_select ON public.request_approvals;
CREATE POLICY req_appr_approver_select ON public.request_approvals
  FOR SELECT TO authenticated
  USING (public.can_act_on_request(auth.uid(), id));

-- request_approval_history
DROP POLICY IF EXISTS rah_super ON public.request_approval_history;
CREATE POLICY rah_super ON public.request_approval_history
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS rah_select ON public.request_approval_history;
CREATE POLICY rah_select ON public.request_approval_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.request_approvals r
      WHERE r.id = request_approval_id
        AND (
          public.is_admin_or_hr_in_client(auth.uid(), r.client_id)
          OR r.requester_employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
          OR public.can_act_on_request(auth.uid(), r.id)
        )
    )
  );

DROP POLICY IF EXISTS rah_insert ON public.request_approval_history;
CREATE POLICY rah_insert ON public.request_approval_history
  FOR INSERT TO authenticated WITH CHECK (true);  -- writes happen via SECURITY DEFINER fns

-- request_assignments
DROP POLICY IF EXISTS ra_super ON public.request_assignments;
CREATE POLICY ra_super ON public.request_assignments
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS ra_admin ON public.request_assignments;
CREATE POLICY ra_admin ON public.request_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.request_approvals r
            WHERE r.id = request_approval_id
              AND public.is_admin_or_hr_in_client(auth.uid(), r.client_id))
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS ra_select ON public.request_assignments;
CREATE POLICY ra_select ON public.request_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.request_approvals r
      WHERE r.id = request_approval_id
        AND (
          r.requester_employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
          OR public.can_act_on_request(auth.uid(), r.id)
        )
    )
  );

-- payroll_payment_status
DROP POLICY IF EXISTS pps_super ON public.payroll_payment_status;
CREATE POLICY pps_super ON public.payroll_payment_status
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS pps_admin ON public.payroll_payment_status;
CREATE POLICY pps_admin ON public.payroll_payment_status
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

DROP POLICY IF EXISTS pps_requester_select ON public.payroll_payment_status;
CREATE POLICY pps_requester_select ON public.payroll_payment_status
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.request_approvals r
      WHERE r.id = request_approval_id
        AND r.requester_employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
  );

-- 3. Workflow functions -------------------------------------------------

CREATE OR REPLACE FUNCTION public.start_request_workflow(
  _module text,
  _entity_id uuid,
  _client_id uuid,
  _requester_employee_id uuid,
  _value bigint DEFAULT 0,
  _value_unit text DEFAULT 'halalas',
  _category text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_category text := COALESCE(_category, _module || 's');
  v_policy_id uuid;
  v_group_id uuid;
  v_first_level int := 1;
  v_assignee record;
BEGIN
  -- Resolve a matching active policy
  SELECT id, group_id INTO v_policy_id, v_group_id
  FROM public.approval_policies
  WHERE client_id = _client_id
    AND category = v_category
    AND COALESCE(is_active, true) = true
    AND COALESCE(min_value, 0) <= _value
    AND (max_value IS NULL OR max_value >= _value)
  ORDER BY sort_order, min_value
  LIMIT 1;

  -- Try a configured first level if policy_levels exist
  IF v_policy_id IS NOT NULL THEN
    SELECT level_order, group_id INTO v_first_level, v_group_id
    FROM public.approval_policy_levels
    WHERE policy_id = v_policy_id
    ORDER BY level_order ASC
    LIMIT 1;
    IF v_first_level IS NULL THEN v_first_level := 1; END IF;
  END IF;

  INSERT INTO public.request_approvals (
    client_id, module, entity_id, requester_employee_id,
    policy_id, value_amount, value_unit, current_level, current_group_id, status
  ) VALUES (
    _client_id, _module, _entity_id, _requester_employee_id,
    v_policy_id, COALESCE(_value, 0), COALESCE(_value_unit, 'halalas'),
    COALESCE(v_first_level, 1), v_group_id, 'pending'
  )
  ON CONFLICT (module, entity_id) DO UPDATE
    SET status = EXCLUDED.status,
        current_level = EXCLUDED.current_level,
        current_group_id = EXCLUDED.current_group_id,
        policy_id = EXCLUDED.policy_id,
        value_amount = EXCLUDED.value_amount,
        updated_at = now()
  RETURNING id INTO v_request_id;

  -- Initial submission history
  INSERT INTO public.request_approval_history (
    request_approval_id, level_order, action, actor_user_id, actor_employee_id, group_id, comment
  ) VALUES (
    v_request_id, COALESCE(v_first_level, 1), 'submitted', auth.uid(), _requester_employee_id, v_group_id,
    CASE WHEN v_group_id IS NULL THEN 'No matching approval policy — routed to admins.' ELSE NULL END
  );

  -- Create assignments (delegation-aware) for the first level
  IF v_group_id IS NOT NULL THEN
    DELETE FROM public.request_assignments
      WHERE request_approval_id = v_request_id AND level_order = COALESCE(v_first_level, 1);
    FOR v_assignee IN SELECT * FROM public.get_active_approvers(v_group_id) LOOP
      INSERT INTO public.request_assignments (
        request_approval_id, level_order, group_id, employee_id, via_delegation, status
      ) VALUES (
        v_request_id, COALESCE(v_first_level, 1), v_group_id, v_assignee.employee_id, v_assignee.via_delegation, 'pending'
      );
    END LOOP;
  END IF;

  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.act_on_request(
  _request_approval_id uuid,
  _action text,             -- 'approved' | 'rejected' | 'delivered'
  _comment text DEFAULT NULL
) RETURNS public.request_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.request_approvals;
  v_emp_id uuid;
  v_assignment_id uuid;
  v_next_level int;
  v_next_group uuid;
  v_assignee record;
  v_pending_in_level int;
BEGIN
  SELECT * INTO v_row FROM public.request_approvals WHERE id = _request_approval_id FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_row.status NOT IN ('pending') AND _action <> 'delivered' THEN
    RAISE EXCEPTION 'Request is not pending';
  END IF;

  IF NOT public.can_act_on_request(auth.uid(), _request_approval_id) THEN
    RAISE EXCEPTION 'Not authorized to act on this request';
  END IF;

  SELECT id INTO v_emp_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;

  -- Mark the caller's assignment(s) at the current level as acted (if any)
  UPDATE public.request_assignments
     SET status = 'acted', acted_at = now()
   WHERE request_approval_id = _request_approval_id
     AND level_order = v_row.current_level
     AND employee_id = v_emp_id
     AND status = 'pending';

  -- Write history
  INSERT INTO public.request_approval_history (
    request_approval_id, level_order, action, actor_user_id, actor_employee_id, group_id, comment
  ) VALUES (
    _request_approval_id, v_row.current_level, _action, auth.uid(), v_emp_id, v_row.current_group_id, _comment
  );

  IF _action = 'rejected' THEN
    UPDATE public.request_approvals
       SET status = 'rejected', finalized_at = now(), updated_at = now()
     WHERE id = _request_approval_id
     RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  IF _action = 'delivered' THEN
    UPDATE public.request_approvals
       SET status = 'delivered', finalized_at = now(), updated_at = now()
     WHERE id = _request_approval_id
     RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  -- _action = 'approved': any-one approval semantics by default — finish the level
  -- Mark all remaining pending assignments at this level as skipped
  UPDATE public.request_assignments
     SET status = 'skipped', acted_at = now()
   WHERE request_approval_id = _request_approval_id
     AND level_order = v_row.current_level
     AND status = 'pending';

  -- Find next policy level
  SELECT level_order, group_id INTO v_next_level, v_next_group
  FROM public.approval_policy_levels
  WHERE policy_id = v_row.policy_id
    AND level_order > v_row.current_level
  ORDER BY level_order ASC
  LIMIT 1;

  IF v_next_level IS NULL THEN
    -- finalize as approved
    UPDATE public.request_approvals
       SET status = 'approved', finalized_at = now(), updated_at = now()
     WHERE id = _request_approval_id
     RETURNING * INTO v_row;

    -- Create payment status row for financial modules
    IF v_row.module IN ('expense', 'advance', 'loan') THEN
      INSERT INTO public.payroll_payment_status (client_id, request_approval_id, module, entity_id, amount)
      VALUES (v_row.client_id, v_row.id, v_row.module, v_row.entity_id, v_row.value_amount)
      ON CONFLICT (request_approval_id) DO NOTHING;
    END IF;
  ELSE
    UPDATE public.request_approvals
       SET current_level = v_next_level, current_group_id = v_next_group, updated_at = now()
     WHERE id = _request_approval_id
     RETURNING * INTO v_row;

    IF v_next_group IS NOT NULL THEN
      FOR v_assignee IN SELECT * FROM public.get_active_approvers(v_next_group) LOOP
        INSERT INTO public.request_assignments (
          request_approval_id, level_order, group_id, employee_id, via_delegation, status
        ) VALUES (
          _request_approval_id, v_next_level, v_next_group, v_assignee.employee_id, v_assignee.via_delegation, 'pending'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_request_paid(
  _request_approval_id uuid,
  _payroll_run_id uuid DEFAULT NULL,
  _paid boolean DEFAULT true
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.request_approvals;
BEGIN
  SELECT * INTO v_row FROM public.request_approvals WHERE id = _request_approval_id;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF NOT public.is_admin_or_hr_in_client(auth.uid(), v_row.client_id) AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.payroll_payment_status
     SET payroll_run_id = COALESCE(_payroll_run_id, payroll_run_id),
         paid_at = CASE WHEN _paid THEN now() ELSE NULL END,
         paid_by = CASE WHEN _paid THEN auth.uid() ELSE NULL END,
         updated_at = now()
   WHERE request_approval_id = _request_approval_id;

  UPDATE public.request_approvals
     SET status = CASE WHEN _paid THEN 'paid' ELSE 'unpaid' END,
         updated_at = now()
   WHERE id = _request_approval_id;

  INSERT INTO public.request_approval_history (
    request_approval_id, level_order, action, actor_user_id, comment
  ) VALUES (
    _request_approval_id, v_row.current_level,
    CASE WHEN _paid THEN 'paid' ELSE 'unpaid' END,
    auth.uid(),
    CASE WHEN _payroll_run_id IS NOT NULL THEN 'Linked to payroll run ' || _payroll_run_id::text ELSE NULL END
  );
END;
$$;

-- 4. Realtime -----------------------------------------------------------

ALTER TABLE public.request_approvals REPLICA IDENTITY FULL;
ALTER TABLE public.request_approval_history REPLICA IDENTITY FULL;
ALTER TABLE public.request_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.payroll_payment_status REPLICA IDENTITY FULL;

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='request_approvals';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.request_approvals; END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='request_approval_history';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.request_approval_history; END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='request_assignments';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.request_assignments; END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='payroll_payment_status';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.payroll_payment_status; END IF;
END $$;
