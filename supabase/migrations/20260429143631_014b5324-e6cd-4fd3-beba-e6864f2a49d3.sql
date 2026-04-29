-- ROLES TABLE
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

CREATE POLICY "client members can read roles"
  ON public.roles FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "client admins can manage roles"
  ON public.roles FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ROLE FEATURES TABLE
CREATE TABLE IF NOT EXISTS public.role_features (
  role_id        uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  feature_key    text NOT NULL,
  people_enabled boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, feature_key)
);

ALTER TABLE public.role_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client members can read role_features"
  ON public.role_features FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id
      AND r.client_id = public.get_user_client_id(auth.uid())
    )
  );

CREATE POLICY "client admins can manage role_features"
  ON public.role_features FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id
      AND public.is_admin_or_hr_in_client(auth.uid(), r.client_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id
      AND public.is_admin_or_hr_in_client(auth.uid(), r.client_id)
    )
  );

-- ADD role_id TO employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL;

-- SEED DEFAULTS FOR EXISTING CLIENTS
INSERT INTO public.roles (client_id, name, is_system, description, color)
SELECT c.id, 'Admin', true, 'Full access to all company features and settings', '#6c5ce7'
FROM public.clients c
WHERE NOT EXISTS (SELECT 1 FROM public.roles r WHERE r.client_id = c.id AND r.name = 'Admin');

INSERT INTO public.roles (client_id, name, is_system, description, color)
SELECT c.id, 'Employee', true, 'Self-service access — own payslips, leave, expenses, assets', '#00b894'
FROM public.clients c
WHERE NOT EXISTS (SELECT 1 FROM public.roles r WHERE r.client_id = c.id AND r.name = 'Employee');

-- AUTO-SEED FOR NEW CLIENTS
CREATE OR REPLACE FUNCTION public.seed_default_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.roles (client_id, name, is_system, description, color) VALUES
    (NEW.id, 'Admin',    true, 'Full access to all company features and settings', '#6c5ce7'),
    (NEW.id, 'Employee', true, 'Self-service access — own payslips, leave, expenses, assets', '#00b894');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_roles ON public.clients;
CREATE TRIGGER trg_seed_default_roles
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_roles();

-- HELPER: get role for current user
CREATE OR REPLACE FUNCTION public.get_employee_role_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.role_id
  FROM public.employees e
  WHERE e.user_id = _user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_role_id(uuid) TO authenticated;

-- HELPER: get role features for user's role
CREATE OR REPLACE FUNCTION public.get_role_features(_user_id uuid)
RETURNS TABLE(feature_key text, people_enabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rf.feature_key, rf.people_enabled
  FROM public.role_features rf
  INNER JOIN public.employees e ON e.role_id = rf.role_id
  WHERE e.user_id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_role_features(uuid) TO authenticated;