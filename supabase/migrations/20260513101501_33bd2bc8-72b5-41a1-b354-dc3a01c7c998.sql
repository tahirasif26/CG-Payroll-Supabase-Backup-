
-- Helper: is the user a pending assignee on the workflow row for (module, entity_id)?
CREATE OR REPLACE FUNCTION public.is_pending_request_assignee(
  _user_id uuid, _module text, _entity_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.request_approvals ra
    JOIN public.request_assignments rs ON rs.request_approval_id = ra.id
    JOIN public.employees e ON e.id = rs.employee_id
    WHERE ra.module = _module
      AND ra.entity_id = _entity_id
      AND rs.status = 'pending'
      AND e.user_id = _user_id
  );
$$;

-- ===== expenses =====
CREATE POLICY "admin/hr manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'hr'::app_role)))
  WITH CHECK (client_id = public.get_user_client_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'hr'::app_role)));

CREATE POLICY "approver select expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (public.is_pending_request_assignee(auth.uid(), 'expense', id));

CREATE POLICY "approver update expenses" ON public.expenses
  FOR UPDATE TO authenticated
  USING (public.is_pending_request_assignee(auth.uid(), 'expense', id));

-- ===== advances =====
CREATE POLICY "admin/hr manage advances" ON public.advances
  FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'hr'::app_role)))
  WITH CHECK (client_id = public.get_user_client_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'hr'::app_role)));

CREATE POLICY "approver select advances" ON public.advances
  FOR SELECT TO authenticated
  USING (public.is_pending_request_assignee(auth.uid(), 'advance', id));

CREATE POLICY "approver update advances" ON public.advances
  FOR UPDATE TO authenticated
  USING (public.is_pending_request_assignee(auth.uid(), 'advance', id));

-- ===== leave_requests =====
CREATE POLICY "admin/hr manage leave_requests" ON public.leave_requests
  FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'hr'::app_role)))
  WITH CHECK (client_id = public.get_user_client_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'hr'::app_role)));

CREATE POLICY "approver select leave_requests" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (public.is_pending_request_assignee(auth.uid(), 'leave', id));

CREATE POLICY "approver update leave_requests" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (public.is_pending_request_assignee(auth.uid(), 'leave', id));

-- ===== loans (already has admin/hr) =====
CREATE POLICY "approver select loans" ON public.loans
  FOR SELECT TO authenticated
  USING (public.is_pending_request_assignee(auth.uid(), 'loan', id));

CREATE POLICY "approver update loans" ON public.loans
  FOR UPDATE TO authenticated
  USING (public.is_pending_request_assignee(auth.uid(), 'loan', id));

-- ===== asset_requests (add assignee-based policy too) =====
CREATE POLICY "approver select asset_requests via assignment" ON public.asset_requests
  FOR SELECT TO authenticated
  USING (public.is_pending_request_assignee(auth.uid(), 'asset', id));

CREATE POLICY "approver update asset_requests via assignment" ON public.asset_requests
  FOR UPDATE TO authenticated
  USING (public.is_pending_request_assignee(auth.uid(), 'asset', id));
