CREATE POLICY "admin hr manage compensation"
ON public.employee_compensation
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_compensation.employee_id
      AND public.is_admin_or_hr_in_client(auth.uid(), e.client_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_compensation.employee_id
      AND public.is_admin_or_hr_in_client(auth.uid(), e.client_id)
  )
);