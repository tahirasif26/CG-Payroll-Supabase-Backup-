INSERT INTO public.feature_definitions (feature_key, module, module_key, name, description, default_enabled_for_roles)
VALUES
  ('settings.company_profile', 'settings', 'settings', 'Company Profile', 'View and edit company name, logo, fiscal year-end and other organization details.', ARRAY['admin']),
  ('settings.visual_preferences', 'settings', 'settings', 'Visual Preferences', 'Choose the application theme color and visual styling.', ARRAY['admin'])
ON CONFLICT (feature_key) DO NOTHING;