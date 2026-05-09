DROP POLICY IF EXISTS "users select leave_types" ON public.leave_types;
CREATE POLICY "users select leave_types" ON public.leave_types
  FOR SELECT TO authenticated
  USING (client_id = get_user_client_id(auth.uid()));

DROP POLICY IF EXISTS "admin/hr manage leave_types" ON public.leave_types;
CREATE POLICY "admin/hr manage leave_types" ON public.leave_types
  FOR ALL TO authenticated
  USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "admin/hr manage leave_balances" ON public.leave_balances;
CREATE POLICY "admin/hr manage leave_balances" ON public.leave_balances
  FOR ALL TO authenticated
  USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "admin/hr manage leave_allocations" ON public.leave_allocations;
CREATE POLICY "admin/hr manage leave_allocations" ON public.leave_allocations
  FOR ALL TO authenticated
  USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE OR REPLACE FUNCTION public.sync_leave_types_from_payroll_setup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lt_key text;
  lt_val jsonb;
  lt_name text;
  lt_days numeric;
  lt_enabled boolean;
  lt_paid boolean;
  carryforward integer;
  leaves jsonb;
BEGIN
  leaves := COALESCE(NEW.options->'leaves', '{}'::jsonb);
  IF leaves IS NULL OR leaves = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  carryforward := COALESCE((leaves->>'maxCarryForwardDays')::int, 0);

  FOR lt_key, lt_val IN SELECT * FROM jsonb_each(COALESCE(leaves->'leaveTypes', '{}'::jsonb))
  LOOP
    lt_enabled := COALESCE((lt_val->>'enabled')::boolean, true);
    lt_days := COALESCE((lt_val->>'days')::numeric, 0);
    lt_paid := (lt_key <> 'unpaid');
    lt_name := CASE lt_key
      WHEN 'annual' THEN 'Annual Leave'
      WHEN 'sick' THEN 'Sick Leave'
      WHEN 'emergency' THEN 'Emergency Leave'
      WHEN 'maternity' THEN 'Maternity Leave'
      WHEN 'paternity' THEN 'Paternity Leave'
      WHEN 'hajj' THEN 'Hajj Leave'
      WHEN 'unpaid' THEN 'Unpaid Leave'
      ELSE initcap(replace(lt_key, '_', ' '))
    END;

    IF EXISTS (
      SELECT 1 FROM public.leave_types
      WHERE client_id = NEW.client_id AND lower(name) = lower(lt_name)
    ) THEN
      UPDATE public.leave_types
        SET days_per_year = lt_days,
            is_paid = lt_paid,
            is_active = lt_enabled,
            max_carryforward = CASE WHEN lt_key = 'annual' THEN carryforward ELSE max_carryforward END
      WHERE client_id = NEW.client_id AND lower(name) = lower(lt_name);
    ELSE
      INSERT INTO public.leave_types (client_id, name, days_per_year, is_paid, is_active, max_carryforward)
      VALUES (NEW.client_id, lt_name, lt_days, lt_paid, lt_enabled,
              CASE WHEN lt_key = 'annual' THEN carryforward ELSE 0 END);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_leave_types_from_payroll_setup ON public.payroll_setups;
CREATE TRIGGER trg_sync_leave_types_from_payroll_setup
AFTER INSERT OR UPDATE ON public.payroll_setups
FOR EACH ROW EXECUTE FUNCTION public.sync_leave_types_from_payroll_setup();

-- Backfill: trigger fires on UPDATE
UPDATE public.payroll_setups SET updated_at = now();