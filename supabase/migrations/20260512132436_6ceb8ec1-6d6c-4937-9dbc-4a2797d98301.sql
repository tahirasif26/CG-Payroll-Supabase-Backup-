
-- ASSET CATEGORIES dedupe
WITH ranked AS (
  SELECT id, client_id, name,
    ROW_NUMBER() OVER (PARTITION BY client_id, lower(name) ORDER BY created_at, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY client_id, lower(name) ORDER BY created_at, id) AS keep_id
  FROM public.asset_categories
)
UPDATE public.assets a SET category_id = r.keep_id
FROM ranked r WHERE a.category_id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id, client_id, name,
    ROW_NUMBER() OVER (PARTITION BY client_id, lower(name) ORDER BY created_at, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY client_id, lower(name) ORDER BY created_at, id) AS keep_id
  FROM public.asset_categories
)
UPDATE public.asset_store_items s SET category_id = r.keep_id
FROM ranked r WHERE s.category_id = r.id AND r.rn > 1;

DELETE FROM public.asset_categories WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id, lower(name) ORDER BY created_at, id) AS rn
    FROM public.asset_categories
  ) x WHERE rn > 1
);

-- ASSET CONDITIONS dedupe
WITH ranked AS (
  SELECT id, client_id, name,
    ROW_NUMBER() OVER (PARTITION BY client_id, lower(name) ORDER BY created_at, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY client_id, lower(name) ORDER BY created_at, id) AS keep_id
  FROM public.asset_conditions
)
UPDATE public.assets a SET condition_id = r.keep_id
FROM ranked r WHERE a.condition_id = r.id AND r.rn > 1;

DELETE FROM public.asset_conditions WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id, lower(name) ORDER BY created_at, id) AS rn
    FROM public.asset_conditions
  ) x WHERE rn > 1
);

-- ASSET LOCATIONS dedupe
WITH ranked AS (
  SELECT id, client_id, name,
    ROW_NUMBER() OVER (PARTITION BY client_id, lower(name) ORDER BY created_at, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY client_id, lower(name) ORDER BY created_at, id) AS keep_id
  FROM public.asset_locations
)
UPDATE public.assets a SET location_id = r.keep_id
FROM ranked r WHERE a.location_id = r.id AND r.rn > 1;

DELETE FROM public.asset_locations WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id, lower(name) ORDER BY created_at, id) AS rn
    FROM public.asset_locations
  ) x WHERE rn > 1
);

-- Uniqueness constraints (case-insensitive on name within client)
CREATE UNIQUE INDEX IF NOT EXISTS asset_categories_client_name_uniq
  ON public.asset_categories (client_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS asset_conditions_client_name_uniq
  ON public.asset_conditions (client_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS asset_locations_client_name_uniq
  ON public.asset_locations (client_id, lower(name));
