CREATE POLICY "admin hr select client docs" ON public.employee_documents
FOR SELECT USING (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "admin hr insert client docs" ON public.employee_documents
FOR INSERT WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "admin hr update client docs" ON public.employee_documents
FOR UPDATE USING (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "admin hr delete client docs" ON public.employee_documents
FOR DELETE USING (public.is_admin_or_hr_in_client(auth.uid(), client_id));