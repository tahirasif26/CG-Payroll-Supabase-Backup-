-- Helper: did the current user EVER receive an assignment for this expense?
CREATE OR REPLACE FUNCTION public.is_request_assignee(_user_id uuid, _module text, _entity_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.request_approvals ra
    JOIN public.request_assignments rs ON rs.request_approval_id = ra.id
    JOIN public.employees e ON e.id = rs.employee_id
    WHERE ra.module = _module
      AND ra.entity_id = _entity_id
      AND e.user_id = _user_id
  );
$$;

-- Expenses: let approvers keep visibility after they act
DROP POLICY IF EXISTS "approver select expenses" ON public.expenses;
CREATE POLICY "approver select expenses" ON public.expenses
FOR SELECT USING (public.is_request_assignee(auth.uid(), 'expense', id));

-- Admin / HR full visibility within their client
DROP POLICY IF EXISTS "admin manage expenses" ON public.expenses;
CREATE POLICY "admin manage expenses" ON public.expenses
FOR ALL USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

-- Same fix for advances / loans / leave_requests / asset_requests so approvers and admins
-- always see the rows they need to act on or have already acted on.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('advances', 'advance'),
      ('loans', 'loan'),
      ('leave_requests', 'leave'),
      ('asset_requests', 'asset')
    ) AS v(tbl, mod)
  LOOP
    -- Skip tables that don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t.tbl) THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS "approver select %1$s" ON public.%1$I', t.tbl);
    EXECUTE format(
      'CREATE POLICY "approver select %1$s" ON public.%1$I FOR SELECT USING (public.is_request_assignee(auth.uid(), %2$L, id))',
      t.tbl, t.mod
    );

    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$I', t.tbl);
    EXECUTE format(
      'CREATE POLICY "admin manage %1$s" ON public.%1$I FOR ALL USING (public.is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id))',
      t.tbl
    );
  END LOOP;
END $$;