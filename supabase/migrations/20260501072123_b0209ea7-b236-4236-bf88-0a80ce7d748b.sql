-- STEP 1: Update is_admin_or_hr_in_client to also check the roles table for custom roles
CREATE OR REPLACE FUNCTION public.is_admin_or_hr_in_client(
  _user_id uuid,
  _client_id uuid
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _client_id = public.get_user_client_id(_user_id)
  AND (
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'hr')
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      JOIN public.roles r ON r.id = e.role_id
      WHERE e.user_id = _user_id
        AND e.client_id = _client_id
        AND r.is_system = false
    )
  );
$$;

-- STEP 2: Add helper for any client staff check
CREATE OR REPLACE FUNCTION public.is_client_staff(
  _user_id uuid,
  _client_id uuid
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _client_id = public.get_user_client_id(_user_id)
  AND (
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'hr')
    OR EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.roles r ON r.id = e.role_id
      WHERE e.user_id = _user_id
        AND e.client_id = _client_id
        AND r.is_system = false
    )
    OR public.has_role(_user_id, 'employee')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_hr_in_client(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client_staff(uuid, uuid) TO authenticated;

-- STEP 3: Backfill user_roles for existing custom-role employees
UPDATE public.user_roles ur
SET role = 'hr'
FROM public.employees e
JOIN public.roles r ON r.id = e.role_id
WHERE e.user_id = ur.user_id
  AND e.client_id = ur.client_id
  AND r.is_system = false
  AND ur.role = 'employee';