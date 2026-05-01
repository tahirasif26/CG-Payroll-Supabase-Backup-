-- Allow client admins/HR to view audit logs for their client
CREATE POLICY "client admins read audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  client_id IS NOT NULL
  AND public.is_admin_or_hr_in_client(auth.uid(), client_id)
);