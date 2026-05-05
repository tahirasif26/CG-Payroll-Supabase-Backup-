-- employee_addresses: admin/HR full access within their client
CREATE POLICY "admin hr manage addresses"
ON public.employee_addresses
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_addresses.employee_id
      AND public.is_admin_or_hr_in_client(auth.uid(), e.client_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_addresses.employee_id
      AND public.is_admin_or_hr_in_client(auth.uid(), e.client_id)
  )
);

-- employee_bank_details
CREATE POLICY "admin hr manage bank"
ON public.employee_bank_details
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_bank_details.employee_id
      AND public.is_admin_or_hr_in_client(auth.uid(), e.client_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_bank_details.employee_id
      AND public.is_admin_or_hr_in_client(auth.uid(), e.client_id)
  )
);

-- employee_emergency_contacts
CREATE POLICY "admin hr manage ec"
ON public.employee_emergency_contacts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_emergency_contacts.employee_id
      AND public.is_admin_or_hr_in_client(auth.uid(), e.client_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_emergency_contacts.employee_id
      AND public.is_admin_or_hr_in_client(auth.uid(), e.client_id)
  )
);

-- employee_education
CREATE POLICY "admin hr manage edu"
ON public.employee_education
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_education.employee_id
      AND public.is_admin_or_hr_in_client(auth.uid(), e.client_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_education.employee_id
      AND public.is_admin_or_hr_in_client(auth.uid(), e.client_id)
  )
);

-- Also add INSERT/UPDATE/DELETE for employee_bank_details (employee can manage own)
CREATE POLICY "employee insert own bank"
ON public.employee_bank_details
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- employee_education employee insert/update/delete own
CREATE POLICY "employee manage own edu"
ON public.employee_education
FOR ALL
TO authenticated
USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
)
WITH CHECK (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);