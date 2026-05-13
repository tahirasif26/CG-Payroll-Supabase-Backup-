
-- Add explicit verification tracking fields to employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_employees_client_verified
  ON public.employees (client_id, is_verified);

-- Backfill from existing profiles.last_login_at (any prior login = verified)
UPDATE public.employees e
   SET is_verified = true,
       verified_at = COALESCE(e.verified_at, p.last_login_at)
  FROM public.profiles p
 WHERE p.id = e.user_id
   AND p.last_login_at IS NOT NULL
   AND e.is_verified = false;

-- Enable realtime so admin dashboard updates instantly
ALTER TABLE public.employees REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Secure RPC: marks the calling user's employee record verified.
-- SECURITY DEFINER so it can write regardless of RLS, but only ever
-- touches the row whose user_id = auth.uid().
CREATE OR REPLACE FUNCTION public.mark_self_verified()
RETURNS public.employees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.employees;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Try direct match by user_id
  UPDATE public.employees
     SET is_verified = true,
         verified_at = COALESCE(verified_at, now()),
         status      = CASE WHEN status IS NULL OR status = '' THEN 'active' ELSE status END,
         updated_at  = now()
   WHERE user_id = v_uid
   RETURNING * INTO v_row;

  -- Fallback: link via email when user_id wasn't yet stamped on the row
  IF v_row.id IS NULL THEN
    UPDATE public.employees e
       SET user_id = v_uid,
           is_verified = true,
           verified_at = COALESCE(verified_at, now()),
           updated_at  = now()
      FROM auth.users u
     WHERE u.id = v_uid
       AND lower(e.email) = lower(u.email)
       AND e.user_id IS NULL
     RETURNING e.* INTO v_row;
  END IF;

  -- Mirror to profile for legacy consumers
  UPDATE public.profiles
     SET last_login_at = COALESCE(last_login_at, now())
   WHERE id = v_uid;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_self_verified() TO authenticated;
