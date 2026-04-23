-- Update the auto_assign_emp_id trigger function to use generate_next_emp_id
-- (which derives the prefix from company_name, matching what the wizard/edge functions use)
CREATE OR REPLACE FUNCTION public.auto_assign_emp_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.emp_id IS NULL OR NEW.emp_id = '' THEN
    NEW.emp_id := public.generate_next_emp_id(NEW.client_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Also rewrite generate_next_emp_id to scan ONLY rows with the matching company prefix
-- so different clients (or legacy IDs like CG-001) don't collide on the numeric sequence.
CREATE OR REPLACE FUNCTION public.generate_next_emp_id(_client_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Only consider IDs for THIS client that match THIS prefix pattern
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
    AND emp_id ~ ('^' || v_prefix || '-[0-9]+$');

  RETURN v_prefix || '-' || LPAD(v_next_num::text, 3, '0');
END;
$function$;