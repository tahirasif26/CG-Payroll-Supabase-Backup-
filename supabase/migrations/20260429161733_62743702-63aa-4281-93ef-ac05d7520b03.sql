
-- Ensure roles + role_features exist (safe)
CREATE TABLE IF NOT EXISTS public.roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name        text NOT NULL,
  is_system   boolean NOT NULL DEFAULT false,
  description text,
  color       text DEFAULT '#6c5ce7',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.role_features (
  role_id        uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  feature_key    text NOT NULL,
  people_enabled boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, feature_key)
);
ALTER TABLE public.role_features ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL;

-- Seed default roles for any client that doesn't have them
INSERT INTO public.roles (client_id, name, is_system, description, color)
SELECT c.id, 'Admin', true, 'Full access to all company features', '#6c5ce7'
FROM public.clients c
WHERE NOT EXISTS (SELECT 1 FROM public.roles r WHERE r.client_id = c.id AND r.name = 'Admin');

INSERT INTO public.roles (client_id, name, is_system, description, color)
SELECT c.id, 'Employee', true, 'Self-service access', '#00b894'
FROM public.clients c
WHERE NOT EXISTS (SELECT 1 FROM public.roles r WHERE r.client_id = c.id AND r.name = 'Employee');

-- Trigger to auto-seed default roles for new clients
CREATE OR REPLACE FUNCTION public.seed_default_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.roles (client_id, name, is_system, description, color) VALUES
    (NEW.id, 'Admin',    true, 'Full access to all company features', '#6c5ce7'),
    (NEW.id, 'Employee', true, 'Self-service access — payslips, leave, expenses', '#00b894')
  ON CONFLICT (client_id, name) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_roles ON public.clients;
CREATE TRIGGER trg_seed_default_roles
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_roles();

-- Backfill existing admin employees
UPDATE public.employees e
SET role_id = r.id
FROM public.roles r
JOIN public.user_roles ur ON ur.client_id = r.client_id AND ur.role = 'admin'
WHERE r.name = 'Admin' AND r.is_system = true
  AND e.user_id = ur.user_id AND e.client_id = r.client_id AND e.role_id IS NULL;

-- Backfill existing non-admin employees to Employee role
UPDATE public.employees e
SET role_id = r.id
FROM public.roles r
WHERE r.name = 'Employee' AND r.is_system = true
  AND e.client_id = r.client_id AND e.role_id IS NULL;
