INSERT INTO public.feature_definitions 
  (feature_key, module, module_key, name, description, default_enabled_for_roles)
VALUES
  (
    'assets.manage_store',
    'assets',
    'assets',
    'Manage Asset Store',
    'Add, edit and remove items from the asset store catalog.',
    ARRAY['admin', 'hr']
  )
ON CONFLICT (feature_key) DO NOTHING;