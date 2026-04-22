-- Drop old functions if they exist
DROP FUNCTION IF EXISTS public.generate_next_emp_id(uuid);
DROP FUNCTION IF EXISTS public.generate_emp_id_prefix(text);

-- Helper function: extract 2-letter prefix from company name
CREATE OR REPLACE FUNCTION public.generate_emp_id_prefix(_company_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
  prefix text;
BEGIN
  IF _company_name IS NULL OR LENGTH(TRIM(_company_name)) = 0 THEN
    RETURN 'EM';
  END IF;

  cleaned := REGEXP_REPLACE(_company_name, '[^a-zA-Z]', '', 'g');

  IF LENGTH(cleaned) = 0 THEN
    RETURN 'EM';
  END IF;

  IF LENGTH(cleaned) = 1 THEN
    prefix := UPPER(cleaned) || 'X';
  ELSE
    prefix := UPPER(SUBSTRING(cleaned, 1, 2));
  END IF;

  RETURN prefix;
END;
$$;

-- Main function: generate next sequential emp_id for a specific client
CREATE OR REPLACE FUNCTION public.generate_next_emp_id(_client_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_name text;
  v_prefix text;
  v_next_num int;
BEGIN
  SELECT c.company_name INTO v_company_name
  FROM public.clients c
  WHERE c.id = _client_id;

  IF v_company_name IS NULL THEN
    RAISE EXCEPTION 'Client not found: %', _client_id;
  END IF;

  v_prefix := public.generate_emp_id_prefix(v_company_name);

  SELECT COALESCE(
    MAX(
      CAST(
        REGEXP_REPLACE(
          SUBSTRING(emp_id FROM '[0-9]+$'),
          '[^0-9]', '', 'g'
        ) AS int
      )
    ),
    0
  ) + 1
  INTO v_next_num
  FROM public.employees
  WHERE client_id = _client_id
    AND emp_id IS NOT NULL
    AND emp_id ~ '^[A-Z]+-[0-9]+$';

  RETURN v_prefix || '-' || LPAD(v_next_num::text, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_emp_id_prefix(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_next_emp_id(uuid) TO authenticated, service_role;

-- Ensure unique constraint on (client_id, emp_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_client_id_emp_id_key'
      AND conrelid = 'public.employees'::regclass
  ) THEN
    ALTER TABLE public.employees
    ADD CONSTRAINT employees_client_id_emp_id_key
    UNIQUE (client_id, emp_id);
  END IF;
END $$;

-- Renumber existing employees per client using new prefix
WITH ranked AS (
  SELECT
    e.id,
    e.client_id,
    public.generate_emp_id_prefix(c.company_name) AS prefix,
    ROW_NUMBER() OVER (PARTITION BY e.client_id ORDER BY e.created_at ASC, e.id ASC) AS seq
  FROM public.employees e
  JOIN public.clients c ON c.id = e.client_id
)
UPDATE public.employees e
SET emp_id = r.prefix || '-' || LPAD(r.seq::text, 3, '0')
FROM ranked r
WHERE e.id = r.id;