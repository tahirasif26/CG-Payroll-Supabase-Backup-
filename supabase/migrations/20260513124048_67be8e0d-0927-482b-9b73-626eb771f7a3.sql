-- =========================================================
-- Workflow engine v2: strict group routing, self-approval
-- prevention, and automatic escalation to next level/admins.
-- =========================================================

-- 1) Eligibility helper: active approvers of a group, excluding a given employee.
CREATE OR REPLACE FUNCTION public.get_eligible_approvers(
  _group_id uuid,
  _exclude_employee_id uuid DEFAULT NULL
)
RETURNS TABLE(employee_id uuid, via_delegation boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.employee_id, a.via_delegation
  FROM public.get_active_approvers(_group_id) a
  WHERE _exclude_employee_id IS NULL OR a.employee_id <> _exclude_employee_id;
$$;

-- 2) Replace start_request_workflow to:
--    - exclude the requester from assignments
--    - auto-escalate to the next policy level if the matched group has no eligible approver
--    - fall back to notifying admins if no level produces an eligible approver
CREATE OR REPLACE FUNCTION public.start_request_workflow(
  _module text,
  _entity_id uuid,
  _client_id uuid,
  _requester_employee_id uuid,
  _value bigint DEFAULT 0,
  _value_unit text DEFAULT 'halalas',
  _category text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request_id uuid;
  v_category text := COALESCE(_category, _module || 's');
  v_policy_id uuid;
  v_group_id uuid;
  v_level int;
  v_assignee record;
  v_inserted int;
  v_admin record;
  v_escalation_note text := NULL;
BEGIN
  -- Resolve a matching active policy + its first level group
  SELECT id, group_id INTO v_policy_id, v_group_id
  FROM public.approval_policies
  WHERE client_id = _client_id
    AND category = v_category
    AND COALESCE(is_active, true) = true
    AND COALESCE(min_value, 0) <= _value
    AND (max_value IS NULL OR max_value >= _value)
  ORDER BY sort_order, min_value
  LIMIT 1;

  v_level := 1;
  IF v_policy_id IS NOT NULL THEN
    SELECT level_order, group_id INTO v_level, v_group_id
    FROM public.approval_policy_levels
    WHERE policy_id = v_policy_id
    ORDER BY level_order ASC
    LIMIT 1;
    IF v_level IS NULL THEN v_level := 1; END IF;
  END IF;

  -- Create the workflow row
  INSERT INTO public.request_approvals (
    client_id, module, entity_id, requester_employee_id,
    policy_id, value_amount, value_unit, current_level, current_group_id, status
  ) VALUES (
    _client_id, _module, _entity_id, _requester_employee_id,
    v_policy_id, COALESCE(_value, 0), COALESCE(_value_unit, 'halalas'),
    v_level, v_group_id, 'pending'
  )
  ON CONFLICT (module, entity_id) DO UPDATE
    SET status = 'pending',
        current_level = EXCLUDED.current_level,
        current_group_id = EXCLUDED.current_group_id,
        policy_id = EXCLUDED.policy_id,
        value_amount = EXCLUDED.value_amount,
        updated_at = now()
  RETURNING id INTO v_request_id;

  -- Clear any prior assignments for this entity (re-submission case)
  DELETE FROM public.request_assignments WHERE request_approval_id = v_request_id;

  -- Initial submission history
  INSERT INTO public.request_approval_history (
    request_approval_id, level_order, action, actor_user_id, actor_employee_id, group_id, comment
  ) VALUES (
    v_request_id, v_level, 'submitted', auth.uid(), _requester_employee_id, v_group_id, NULL
  );

  -- Walk policy levels until we find one with at least one eligible approver
  -- (excluding the requester). If the matched group is empty after exclusion,
  -- automatically escalate to the next configured level.
  WHILE v_group_id IS NOT NULL LOOP
    v_inserted := 0;
    FOR v_assignee IN
      SELECT * FROM public.get_eligible_approvers(v_group_id, _requester_employee_id)
    LOOP
      INSERT INTO public.request_assignments (
        request_approval_id, level_order, group_id, employee_id, via_delegation, status
      ) VALUES (
        v_request_id, v_level, v_group_id, v_assignee.employee_id, v_assignee.via_delegation, 'pending'
      )
      ON CONFLICT DO NOTHING;
      v_inserted := v_inserted + 1;
    END LOOP;

    EXIT WHEN v_inserted > 0;

    -- No eligible approver at this level → escalate
    v_escalation_note := 'Auto-escalated: no eligible approver at level ' || v_level
                         || ' (creator excluded or group empty).';
    INSERT INTO public.request_approval_history (
      request_approval_id, level_order, action, actor_user_id, actor_employee_id, group_id, comment
    ) VALUES (
      v_request_id, v_level, 'escalated', auth.uid(), _requester_employee_id, v_group_id, v_escalation_note
    );

    -- Find next policy level
    SELECT level_order, group_id INTO v_level, v_group_id
    FROM public.approval_policy_levels
    WHERE policy_id = v_policy_id
      AND level_order > v_level
    ORDER BY level_order ASC
    LIMIT 1;

    EXIT WHEN v_level IS NULL;

    UPDATE public.request_approvals
       SET current_level = v_level, current_group_id = v_group_id, updated_at = now()
     WHERE id = v_request_id;
  END LOOP;

  -- Final fallback: no policy or no eligible approver at any level → notify admins
  -- (excluding the requester) so the request is still actionable.
  IF NOT EXISTS (
    SELECT 1 FROM public.request_assignments
    WHERE request_approval_id = v_request_id AND status = 'pending'
  ) THEN
    FOR v_admin IN
      SELECT DISTINCT e.id AS employee_id
      FROM public.user_roles ur
      JOIN public.employees e ON e.user_id = ur.user_id AND e.client_id = ur.client_id
      WHERE ur.client_id = _client_id
        AND ur.role = 'admin'::public.app_role
        AND e.id <> _requester_employee_id
    LOOP
      INSERT INTO public.request_assignments (
        request_approval_id, level_order, group_id, employee_id, via_delegation, status
      ) VALUES (
        v_request_id, COALESCE(v_level, 999), NULL, v_admin.employee_id, false, 'pending'
      )
      ON CONFLICT DO NOTHING;
    END LOOP;

    INSERT INTO public.request_approval_history (
      request_approval_id, level_order, action, actor_user_id, actor_employee_id, group_id, comment
    ) VALUES (
      v_request_id, COALESCE(v_level, 999), 'escalated', auth.uid(), _requester_employee_id, NULL,
      'Final fallback → routed to client admins (no eligible group approver).'
    );
  END IF;

  RETURN v_request_id;
END;
$$;

-- 3) Tighten can_act_on_request: only super_admin OR explicit pending assignee may act.
--    Client admin/HR no longer get blanket rights — they must be in the assignment list
--    (which the workflow engine adds them to as the documented fallback).
CREATE OR REPLACE FUNCTION public.can_act_on_request(_user_id uuid, _request_approval_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_requester uuid;
  v_caller_emp uuid;
BEGIN
  IF public.is_super_admin(_user_id) THEN RETURN true; END IF;

  SELECT requester_employee_id INTO v_requester
  FROM public.request_approvals WHERE id = _request_approval_id;
  IF v_requester IS NULL THEN RETURN false; END IF;

  SELECT id INTO v_caller_emp FROM public.employees WHERE user_id = _user_id LIMIT 1;
  -- Self-approval prevention
  IF v_caller_emp IS NOT NULL AND v_caller_emp = v_requester THEN
    RETURN false;
  END IF;

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

-- 4) act_on_request: also block self-approval explicitly (defence in depth).
CREATE OR REPLACE FUNCTION public.act_on_request(_request_approval_id uuid, _action text, _comment text DEFAULT NULL::text)
RETURNS public.request_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.request_approvals;
  v_emp_id uuid;
  v_next_level int;
  v_next_group uuid;
  v_assignee record;
  v_inserted int;
BEGIN
  SELECT * INTO v_row FROM public.request_approvals WHERE id = _request_approval_id FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_row.status NOT IN ('pending') AND _action <> 'delivered' THEN
    RAISE EXCEPTION 'Request is not pending';
  END IF;

  SELECT id INTO v_emp_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;

  IF v_emp_id IS NOT NULL AND v_emp_id = v_row.requester_employee_id THEN
    RAISE EXCEPTION 'Self-approval is not allowed';
  END IF;

  IF NOT public.can_act_on_request(auth.uid(), _request_approval_id) THEN
    RAISE EXCEPTION 'Not authorized to act on this request';
  END IF;

  UPDATE public.request_assignments
     SET status = 'acted', acted_at = now()
   WHERE request_approval_id = _request_approval_id
     AND level_order = v_row.current_level
     AND employee_id = v_emp_id
     AND status = 'pending';

  INSERT INTO public.request_approval_history (
    request_approval_id, level_order, action, actor_user_id, actor_employee_id, group_id, comment
  ) VALUES (
    _request_approval_id, v_row.current_level, _action, auth.uid(), v_emp_id, v_row.current_group_id, _comment
  );

  IF _action = 'rejected' THEN
    UPDATE public.request_approvals
       SET status = 'rejected', finalized_at = now(), updated_at = now()
     WHERE id = _request_approval_id RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  IF _action = 'delivered' THEN
    UPDATE public.request_approvals
       SET status = 'delivered', finalized_at = now(), updated_at = now()
     WHERE id = _request_approval_id RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  -- approved: any-one approval finishes the level
  UPDATE public.request_assignments
     SET status = 'skipped', acted_at = now()
   WHERE request_approval_id = _request_approval_id
     AND level_order = v_row.current_level
     AND status = 'pending';

  -- Walk to next level with eligible approvers (skip empty levels)
  v_next_level := v_row.current_level;
  LOOP
    SELECT level_order, group_id INTO v_next_level, v_next_group
    FROM public.approval_policy_levels
    WHERE policy_id = v_row.policy_id
      AND level_order > v_next_level
    ORDER BY level_order ASC
    LIMIT 1;

    EXIT WHEN v_next_level IS NULL;

    v_inserted := 0;
    FOR v_assignee IN
      SELECT * FROM public.get_eligible_approvers(v_next_group, v_row.requester_employee_id)
    LOOP
      INSERT INTO public.request_assignments (
        request_approval_id, level_order, group_id, employee_id, via_delegation, status
      ) VALUES (
        _request_approval_id, v_next_level, v_next_group, v_assignee.employee_id, v_assignee.via_delegation, 'pending'
      ) ON CONFLICT DO NOTHING;
      v_inserted := v_inserted + 1;
    END LOOP;

    IF v_inserted > 0 THEN
      UPDATE public.request_approvals
         SET current_level = v_next_level, current_group_id = v_next_group, updated_at = now()
       WHERE id = _request_approval_id RETURNING * INTO v_row;
      RETURN v_row;
    ELSE
      INSERT INTO public.request_approval_history (
        request_approval_id, level_order, action, actor_user_id, comment
      ) VALUES (
        _request_approval_id, v_next_level, 'escalated', auth.uid(),
        'Auto-escalated past empty level ' || v_next_level || '.'
      );
    END IF;
  END LOOP;

  -- No more levels → finalize approved
  UPDATE public.request_approvals
     SET status = 'approved', finalized_at = now(), updated_at = now()
   WHERE id = _request_approval_id RETURNING * INTO v_row;

  IF v_row.module IN ('expense', 'advance', 'loan') THEN
    INSERT INTO public.payroll_payment_status (client_id, request_approval_id, module, entity_id, amount)
    VALUES (v_row.client_id, v_row.id, v_row.module, v_row.entity_id, v_row.value_amount)
    ON CONFLICT (request_approval_id) DO NOTHING;
  END IF;

  RETURN v_row;
END;
$$;

-- 5) Tighten RLS on the four request tables: drop the blanket admin/HR SELECT/UPDATE
--    so visibility is governed strictly by is_pending_request_assignee + ownership.
--    Admins still get visibility because the workflow engine adds them as fallback
--    assignees when no group approver is eligible.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('expenses','advances','loans','leave_requests','asset_requests')
      AND (policyname ILIKE '%admin%' OR policyname ILIKE '%hr%')
      AND (policyname ILIKE '%select%' OR policyname ILIKE '%update%' OR policyname ILIKE '%manage%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END$$;
