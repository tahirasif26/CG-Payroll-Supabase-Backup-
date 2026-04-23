-- Admins can do everything on employees within their own client
CREATE POLICY "admins manage own client employees"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

-- Employees can view other employees in the same client (directory, org chart)
CREATE POLICY "employees view same client"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));