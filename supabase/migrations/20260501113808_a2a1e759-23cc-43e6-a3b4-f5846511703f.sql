-- Lock down SECURITY DEFINER helper functions: anon must not call them.
-- These are internal helpers used by RLS policies and triggers; signed-in users
-- only need them indirectly via RLS evaluation.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, public',
      r.schema_name, r.func_name, r.args);
  END LOOP;
END $$;