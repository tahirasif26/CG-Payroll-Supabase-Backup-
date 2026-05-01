CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT ur.role
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
      ORDER BY CASE ur.role
        WHEN 'super_admin' THEN 0
        WHEN 'admin' THEN 1
        WHEN 'hr' THEN 2
        WHEN 'employee' THEN 3
        ELSE 4
      END
      LIMIT 1
    ),
    (
      SELECT CASE
        WHEN r.name = 'Admin' THEN 'admin'::public.app_role
        WHEN r.is_system = false THEN 'hr'::public.app_role
        ELSE 'employee'::public.app_role
      END
      FROM public.employees e
      LEFT JOIN public.roles r ON r.id = e.role_id
      WHERE e.user_id = _user_id
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT ur.client_id
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.client_id IS NOT NULL
        AND ur.role IN ('admin', 'hr', 'employee')
      ORDER BY CASE ur.role
        WHEN 'admin' THEN 1
        WHEN 'hr' THEN 2
        WHEN 'employee' THEN 3
        ELSE 4
      END
      LIMIT 1
    ),
    (
      SELECT e.client_id
      FROM public.employees e
      WHERE e.user_id = _user_id
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_hr_in_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

CREATE OR REPLACE FUNCTION public.is_client_staff(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _client_id = public.get_user_client_id(_user_id)
  AND (
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'hr')
    OR public.has_role(_user_id, 'employee')
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

UPDATE public.user_roles ur
SET role = 'hr'::public.app_role
FROM public.employees e
JOIN public.roles r ON r.id = e.role_id
WHERE ur.user_id = e.user_id
  AND ur.client_id = e.client_id
  AND r.is_system = false
  AND ur.role = 'employee'::public.app_role;