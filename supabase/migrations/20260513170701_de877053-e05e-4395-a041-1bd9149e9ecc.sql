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
  v_policy_value bigint := COALESCE(_value, 0);
  v_expense_amount bigint;
  v_policy_id uuid;
  v_group_id uuid;
  v_level int;
  v_lvl_level int;
  v_lvl_group uuid;
  v_assignee record;
  v_inserted int;
  v_admin record;
  v_escalation_note text := NULL;
BEGIN
  -- Expense amounts in the app are captured in display currency units, while
  -- approval policy ranges are stored in minor units (halalas/cents). Always
  -- normalize expense workflow matching to the policy unit so amount ranges
  -- route to the configured group.
  IF _module = 'expense' AND COALESCE(_value_unit, 'halalas') = 'halalas' THEN
    SELECT amount INTO v_expense_amount
    FROM public.expenses
    WHERE id = _entity_id
      AND client_id = _client_id;

    IF v_expense_amount IS NOT NULL THEN
      v_policy_value := v_expense_amount * 100;
    END IF;
  END IF;

  SELECT id, group_id INTO v_policy_id, v_group_id
  FROM public.approval_policies
  WHERE client_id = _client_id
    AND category = v_category
    AND COALESCE(is_active, true) = true
    AND COALESCE(min_value, 0) <= v_policy_value
    AND (max_value IS NULL OR max_value >= v_policy_value)
  ORDER BY sort_order, min_value
  LIMIT 1;

  v_level := 1;
  IF v_policy_id IS NOT NULL THEN
    SELECT level_order, group_id INTO v_lvl_level, v_lvl_group
    FROM public.approval_policy_levels
    WHERE policy_id = v_policy_id
    ORDER BY level_order ASC
    LIMIT 1;
    -- Only override if a level row actually exists; otherwise keep the
    -- group_id stored directly on approval_policies (single-level UI case).
    IF v_lvl_level IS NOT NULL THEN
      v_level := v_lvl_level;
      v_group_id := v_lvl_group;
    END IF;
  END IF;

  INSERT INTO public.request_approvals (
    client_id, module, entity_id, requester_employee_id,
    policy_id, value_amount, value_unit, current_level, current_group_id, status
  ) VALUES (
    _client_id, _module, _entity_id, _requester_employee_id,
    v_policy_id, v_policy_value, COALESCE(_value_unit, 'halalas'),
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

  DELETE FROM public.request_assignments WHERE request_approval_id = v_request_id;

  INSERT INTO public.request_approval_history (
    request_approval_id, level_order, action, actor_user_id, actor_employee_id, group_id, comment
  ) VALUES (
    v_request_id, v_level, 'submitted', auth.uid(), _requester_employee_id, v_group_id, NULL
  );

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

    v_escalation_note := 'Auto-escalated: no eligible approver at level ' || v_level
                         || ' (creator excluded or group empty).';
    INSERT INTO public.request_approval_history (
      request_approval_id, level_order, action, actor_user_id, actor_employee_id, group_id, comment
    ) VALUES (
      v_request_id, v_level, 'escalated', auth.uid(), _requester_employee_id, v_group_id, v_escalation_note
    );

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