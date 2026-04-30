-- Allow client admins/HR to manage payroll setups for their own client, and members to read
CREATE POLICY "client admins manage payroll_setups"
ON public.payroll_setups
FOR ALL
TO authenticated
USING (is_admin_or_hr_in_client(auth.uid(), client_id))
WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "client members read payroll_setups"
ON public.payroll_setups
FOR SELECT
TO authenticated
USING (client_id = get_user_client_id(auth.uid()));