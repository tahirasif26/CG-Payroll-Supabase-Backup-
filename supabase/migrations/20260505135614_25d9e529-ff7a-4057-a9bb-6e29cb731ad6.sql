-- Allow client admins/HR to manage their own payroll runs and members to read them.
CREATE POLICY "client admins manage payroll_runs"
ON public.payroll_runs
FOR ALL
TO authenticated
USING (is_admin_or_hr_in_client(auth.uid(), client_id))
WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "client members read payroll_runs"
ON public.payroll_runs
FOR SELECT
TO authenticated
USING (client_id = get_user_client_id(auth.uid()));

-- Same for payroll_lines so the detail view works
CREATE POLICY "client admins manage payroll_lines"
ON public.payroll_lines
FOR ALL
TO authenticated
USING (is_admin_or_hr_in_client(auth.uid(), client_id))
WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "client members read payroll_lines"
ON public.payroll_lines
FOR SELECT
TO authenticated
USING (client_id = get_user_client_id(auth.uid()));