CREATE TABLE public.tax_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  name text NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  applies_to text[] NOT NULL DEFAULT ARRAY[]::text[],
  applies_to_countries text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin/hr manage tax_configs"
  ON public.tax_configs FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "super_admin all tax_configs"
  ON public.tax_configs FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "users select tax_configs"
  ON public.tax_configs FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE TRIGGER update_tax_configs_updated_at
  BEFORE UPDATE ON public.tax_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tax_configs_client ON public.tax_configs(client_id);