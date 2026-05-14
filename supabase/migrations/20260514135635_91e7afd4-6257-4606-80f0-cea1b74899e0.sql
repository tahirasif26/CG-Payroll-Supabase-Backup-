-- EOS Benefit Configs: persist per-client EOS rules
CREATE TABLE public.eos_benefit_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('gratuity','provident_fund','other')),
  calculation_basis text NOT NULL DEFAULT 'basic_salary' CHECK (calculation_basis IN ('basic_salary','gross_salary')),
  tiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  applies_to text[] NOT NULL DEFAULT '{}',
  applies_to_countries text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_eos_benefit_configs_client ON public.eos_benefit_configs(client_id);

ALTER TABLE public.eos_benefit_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view EOS configs in their client"
  ON public.eos_benefit_configs FOR SELECT
  USING (public.is_client_staff(auth.uid(), client_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admin/HR can insert EOS configs"
  ON public.eos_benefit_configs FOR INSERT
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admin/HR can update EOS configs"
  ON public.eos_benefit_configs FOR UPDATE
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admin/HR can delete EOS configs"
  ON public.eos_benefit_configs FOR DELETE
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_eos_benefit_configs_updated_at
  BEFORE UPDATE ON public.eos_benefit_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default configs for every existing client
INSERT INTO public.eos_benefit_configs (client_id, name, type, calculation_basis, tiers, applies_to, applies_to_countries, is_active, sort_order)
SELECT c.id,
       'Saudi Gratuity (End of Service Award)',
       'gratuity',
       'basic_salary',
       '[
         {"fromYear":0,"toYear":2,"daysPerYear":10,"fraction":0.5},
         {"fromYear":2,"toYear":5,"daysPerYear":15,"fraction":0.5},
         {"fromYear":5,"toYear":10,"daysPerYear":30,"fraction":1},
         {"fromYear":10,"toYear":null,"daysPerYear":30,"fraction":1}
       ]'::jsonb,
       ARRAY['direct']::text[],
       ARRAY['Saudi Arabia']::text[],
       true,
       1
FROM public.clients c
ON CONFLICT DO NOTHING;

INSERT INTO public.eos_benefit_configs (client_id, name, type, calculation_basis, tiers, applies_to, applies_to_countries, is_active, sort_order)
SELECT c.id,
       'UAE Gratuity (End of Service)',
       'gratuity',
       'basic_salary',
       '[
         {"fromYear":1,"toYear":5,"daysPerYear":21,"fraction":1},
         {"fromYear":5,"toYear":null,"daysPerYear":30,"fraction":1}
       ]'::jsonb,
       ARRAY['direct']::text[],
       ARRAY['UAE']::text[],
       true,
       2
FROM public.clients c
ON CONFLICT DO NOTHING;

-- Auto-seed on new client
CREATE OR REPLACE FUNCTION public.seed_default_eos_configs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.eos_benefit_configs (client_id, name, type, calculation_basis, tiers, applies_to, applies_to_countries, is_active, sort_order) VALUES
    (NEW.id, 'Saudi Gratuity (End of Service Award)', 'gratuity', 'basic_salary',
     '[{"fromYear":0,"toYear":2,"daysPerYear":10,"fraction":0.5},
       {"fromYear":2,"toYear":5,"daysPerYear":15,"fraction":0.5},
       {"fromYear":5,"toYear":10,"daysPerYear":30,"fraction":1},
       {"fromYear":10,"toYear":null,"daysPerYear":30,"fraction":1}]'::jsonb,
     ARRAY['direct']::text[], ARRAY['Saudi Arabia']::text[], true, 1),
    (NEW.id, 'UAE Gratuity (End of Service)', 'gratuity', 'basic_salary',
     '[{"fromYear":1,"toYear":5,"daysPerYear":21,"fraction":1},
       {"fromYear":5,"toYear":null,"daysPerYear":30,"fraction":1}]'::jsonb,
     ARRAY['direct']::text[], ARRAY['UAE']::text[], true, 2);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_seed_default_eos_configs
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_eos_configs();
