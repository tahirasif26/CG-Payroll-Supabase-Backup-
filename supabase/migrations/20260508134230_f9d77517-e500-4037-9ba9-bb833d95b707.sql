CREATE POLICY "Client admins manage scoped user_roles"
ON public.user_roles
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  role IN ('admin'::public.app_role, 'hr'::public.app_role, 'employee'::public.app_role)
  AND client_id IS NOT NULL
  AND client_id = public.get_user_client_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  role IN ('admin'::public.app_role, 'hr'::public.app_role, 'employee'::public.app_role)
  AND client_id IS NOT NULL
  AND client_id = public.get_user_client_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);