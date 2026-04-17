CREATE OR REPLACE FUNCTION public.get_user_features(_user_id uuid)
RETURNS TABLE(feature_key text, enabled boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_role AS (
    SELECT role::text AS role_text
    FROM public.user_roles
    WHERE user_id = _user_id
    ORDER BY
      CASE role
        WHEN 'super_admin' THEN 0
        WHEN 'admin' THEN 1
        WHEN 'hr' THEN 2
        WHEN 'employee' THEN 3
      END
    LIMIT 1
  )
  SELECT
    fd.feature_key,
    COALESCE(
      ft.is_enabled,
      (SELECT role_text FROM user_role) = ANY(fd.default_enabled_for_roles),
      false
    ) AS enabled
  FROM public.feature_definitions fd
  LEFT JOIN public.feature_toggles ft
    ON ft.feature_key = fd.feature_key AND ft.user_id = _user_id;
$$;