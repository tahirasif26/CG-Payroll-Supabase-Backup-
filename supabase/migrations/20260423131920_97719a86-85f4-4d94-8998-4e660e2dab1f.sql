CREATE OR REPLACE FUNCTION public.get_user_enabled_modules(_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.enabled_modules
  FROM public.clients c
  WHERE c.id = public.get_user_client_id(_user_id)
  LIMIT 1;
$$;