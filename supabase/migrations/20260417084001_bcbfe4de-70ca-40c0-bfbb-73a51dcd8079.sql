-- 1. Add super_admin to app_role enum (must be in its own statement, committed before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Create enums for clients table
DO $$ BEGIN
  CREATE TYPE public.client_status AS ENUM ('active', 'suspended', 'trial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_plan AS ENUM ('starter', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  company_slug text UNIQUE,
  company_email text,
  company_phone text,
  country text,
  timezone text NOT NULL DEFAULT 'Asia/Riyadh',
  base_currency text NOT NULL DEFAULT 'SAR',
  status public.client_status NOT NULL DEFAULT 'trial',
  subscription_plan public.subscription_plan NOT NULL DEFAULT 'starter',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Update user_roles: add client_id and adjust uniqueness
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- Drop the old unique constraint on (user_id, role) if it exists
DO $$
DECLARE c_name text;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'public.user_roles'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%(user_id, role)%'
    AND pg_get_constraintdef(oid) NOT ILIKE '%client_id%';
  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

-- Add new composite unique index allowing NULL client_id (for super_admin)
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_client_unique
  ON public.user_roles (user_id, role, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 5. Update profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 6. feature_definitions table
CREATE TABLE IF NOT EXISTS public.feature_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  module text NOT NULL,
  name text NOT NULL,
  description text,
  default_enabled_for_roles text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_definitions ENABLE ROW LEVEL SECURITY;

-- 7. feature_toggles table
CREATE TABLE IF NOT EXISTS public.feature_toggles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  enabled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id, feature_key)
);

ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_feature_toggles_updated_at
  BEFORE UPDATE ON public.feature_toggles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Helper functions
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role IN ('admin', 'hr', 'employee')
    AND client_id IS NOT NULL
  ORDER BY
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'hr' THEN 2
      WHEN 'employee' THEN 3
    END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_feature(_user_id uuid, _feature_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super boolean;
  v_toggle boolean;
  v_role public.app_role;
  v_defaults text[];
BEGIN
  -- 1. Super admin sees everything
  SELECT public.is_super_admin(_user_id) INTO v_is_super;
  IF v_is_super THEN
    RETURN true;
  END IF;

  -- 2. Check explicit per-user toggle
  SELECT is_enabled INTO v_toggle
  FROM public.feature_toggles
  WHERE user_id = _user_id AND feature_key = _feature_key
  LIMIT 1;

  IF FOUND THEN
    RETURN v_toggle;
  END IF;

  -- 3. Fall back to defaults based on the user's primary role
  SELECT public.get_user_role(_user_id) INTO v_role;
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  SELECT default_enabled_for_roles INTO v_defaults
  FROM public.feature_definitions
  WHERE feature_key = _feature_key
  LIMIT 1;

  IF v_defaults IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_role::text = ANY (v_defaults);
END;
$$;

-- 9. Update handle_new_user trigger: only create profile, do NOT auto-assign role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, employee_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NEW.raw_user_meta_data->>'employee_id'
  );
  -- Role assignment now happens explicitly via invite-employee / create-client edge functions.
  RETURN NEW;
END;
$$;