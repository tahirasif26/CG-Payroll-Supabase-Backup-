CREATE OR REPLACE FUNCTION public.generate_emp_id(_client_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
  client_prefix text;
  new_emp_id text;
BEGIN
  SELECT UPPER(LEFT(REGEXP_REPLACE(COALESCE(company_slug, company_name), '[^a-zA-Z0-9]', '', 'g'), 3))
  INTO client_prefix
  FROM public.clients
  WHERE id = _client_id;

  IF client_prefix IS NULL OR client_prefix = '' THEN
    client_prefix := 'EMP';
  END IF;

  SELECT COALESCE(
    MAX(
      CAST(
        NULLIF(REGEXP_REPLACE(emp_id, '[^0-9]', '', 'g'), '')
        AS INTEGER
      )
    ),
    0
  ) + 1
  INTO next_num
  FROM public.employees
  WHERE client_id = _client_id
    AND emp_id ~ ('^' || client_prefix || '-[0-9]+$');

  new_emp_id := client_prefix || '-' || LPAD(next_num::text, 3, '0');
  RETURN new_emp_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_assign_emp_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.emp_id IS NULL OR NEW.emp_id = '' THEN
    NEW.emp_id := public.generate_emp_id(NEW.client_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_emp_id ON public.employees;
CREATE TRIGGER trg_auto_emp_id
  BEFORE INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_emp_id();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_client_id_emp_id_key'
  ) THEN
    ALTER TABLE public.employees
    ADD CONSTRAINT employees_client_id_emp_id_key
    UNIQUE (client_id, emp_id);
  END IF;
END $$;