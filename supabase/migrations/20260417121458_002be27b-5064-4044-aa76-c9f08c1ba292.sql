-- ============================================================
-- Feature Presets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feature_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  toggles jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);

CREATE INDEX IF NOT EXISTS idx_feature_presets_client ON public.feature_presets(client_id);

ALTER TABLE public.feature_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin/hr manage feature_presets"
  ON public.feature_presets FOR ALL
  TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "users select feature_presets in client"
  ON public.feature_presets FOR SELECT
  TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "super_admin all feature_presets"
  ON public.feature_presets FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_feature_presets_updated_at
  BEFORE UPDATE ON public.feature_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Seed default "Standard Employee" preset for new clients
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_default_feature_preset()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_toggles jsonb;
BEGIN
  -- Build toggles map from feature_definitions where 'employee' is in defaults
  SELECT COALESCE(jsonb_object_agg(feature_key, ('employee' = ANY(default_enabled_for_roles))), '{}'::jsonb)
  INTO v_toggles
  FROM public.feature_definitions;

  INSERT INTO public.feature_presets (client_id, name, description, toggles, is_default)
  VALUES (NEW.id, 'Standard Employee', 'Default features for regular employees', COALESCE(v_toggles, '{}'::jsonb), true)
  ON CONFLICT (client_id, name) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_feature_preset ON public.clients;
CREATE TRIGGER trg_seed_default_feature_preset
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_feature_preset();

-- Backfill for existing clients
INSERT INTO public.feature_presets (client_id, name, description, toggles, is_default)
SELECT
  c.id,
  'Standard Employee',
  'Default features for regular employees',
  COALESCE(
    (SELECT jsonb_object_agg(feature_key, ('employee' = ANY(default_enabled_for_roles)))
     FROM public.feature_definitions),
    '{}'::jsonb
  ),
  true
FROM public.clients c
ON CONFLICT (client_id, name) DO NOTHING;

-- ============================================================
-- Rate limits
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies = only service role can access. That's intentional.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key text,
  _max int,
  _window_seconds int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.rate_limits%ROWTYPE;
BEGIN
  -- Try update existing row first
  UPDATE public.rate_limits
     SET count = CASE
                   WHEN window_start < now() - make_interval(secs => _window_seconds) THEN 1
                   ELSE count + 1
                 END,
         window_start = CASE
                          WHEN window_start < now() - make_interval(secs => _window_seconds) THEN now()
                          ELSE window_start
                        END
   WHERE key = _key
   RETURNING * INTO v_row;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (key, count, window_start)
    VALUES (_key, 1, now())
    ON CONFLICT (key) DO UPDATE SET count = public.rate_limits.count + 1
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row.count <= _max;
END;
$$;