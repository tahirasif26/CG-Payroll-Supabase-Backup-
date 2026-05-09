
CREATE TABLE public.employee_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);

CREATE INDEX idx_employee_types_client ON public.employee_types(client_id);

ALTER TABLE public.employee_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client staff can view employee types"
  ON public.employee_types FOR SELECT
  USING (client_id = public.get_user_client_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admin/HR can insert employee types"
  ON public.employee_types FOR INSERT
  WITH CHECK (client_id = public.get_user_client_id(auth.uid())
              AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')));

CREATE POLICY "Admin/HR can update employee types"
  ON public.employee_types FOR UPDATE
  USING (client_id = public.get_user_client_id(auth.uid())
         AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')))
  WITH CHECK (client_id = public.get_user_client_id(auth.uid())
              AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')));

CREATE POLICY "Admin/HR can delete non-default employee types"
  ON public.employee_types FOR DELETE
  USING (client_id = public.get_user_client_id(auth.uid())
         AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
         AND is_default = false);

CREATE TRIGGER trg_employee_types_updated_at
  BEFORE UPDATE ON public.employee_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.seed_default_employee_types()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.employee_types (client_id, name, is_default, is_active) VALUES
    (NEW.id, 'Direct Employee', true, true),
    (NEW.id, 'Contractor',      true, true),
    (NEW.id, 'IT Developer',    false, true),
    (NEW.id, 'Intern',          false, true)
  ON CONFLICT (client_id, name) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_employee_types
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_employee_types();

-- Backfill existing clients
INSERT INTO public.employee_types (client_id, name, is_default, is_active)
SELECT c.id, v.name, v.is_default, true
FROM public.clients c
CROSS JOIN (VALUES
  ('Direct Employee', true),
  ('Contractor',      true),
  ('IT Developer',    false),
  ('Intern',          false)
) AS v(name, is_default)
ON CONFLICT (client_id, name) DO NOTHING;
