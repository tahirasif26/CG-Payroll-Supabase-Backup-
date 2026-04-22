CREATE OR REPLACE FUNCTION public.generate_emp_id_prefix(_company_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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