
-- Track whether an employee document was uploaded by the employee themself
ALTER TABLE public.employee_documents
  ADD COLUMN IF NOT EXISTS uploaded_by_self boolean NOT NULL DEFAULT false;

-- Allow employees to update/delete their own self-uploaded documents
DROP POLICY IF EXISTS "employee update own uploaded docs" ON public.employee_documents;
CREATE POLICY "employee update own uploaded docs"
  ON public.employee_documents
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by_self = true
    AND employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
  WITH CHECK (
    uploaded_by_self = true
    AND employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "employee delete own uploaded docs" ON public.employee_documents;
CREATE POLICY "employee delete own uploaded docs"
  ON public.employee_documents
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by_self = true
    AND employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- Storage policies for the private employee-documents bucket
-- Path convention used by client: <employee_id>/<filename>
DROP POLICY IF EXISTS "Employees read own documents" ON storage.objects;
CREATE POLICY "Employees read own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.employees WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Employees upload own documents" ON storage.objects;
CREATE POLICY "Employees upload own documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.employees WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Employees delete own documents" ON storage.objects;
CREATE POLICY "Employees delete own documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.employees WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins read client employee documents" ON storage.objects;
CREATE POLICY "Admins read client employee documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT e.id::text FROM public.employees e
      WHERE public.is_admin_or_hr_in_client(auth.uid(), e.client_id)
    )
  );
