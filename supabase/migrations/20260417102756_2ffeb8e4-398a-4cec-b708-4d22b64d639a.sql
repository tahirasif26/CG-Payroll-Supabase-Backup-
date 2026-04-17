-- ============ LEAVE: add carried_forward + leave_allocations table ============
ALTER TABLE public.leave_balances 
  ADD COLUMN IF NOT EXISTS carried_forward numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.leave_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  leave_type_id uuid NOT NULL,
  allocated_days numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, leave_type_id)
);

ALTER TABLE public.leave_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin/hr manage leave_allocations" ON public.leave_allocations
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "super_admin all leave_allocations" ON public.leave_allocations
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "employee select own leave_allocations" ON public.leave_allocations
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE TRIGGER leave_allocations_updated_at
  BEFORE UPDATE ON public.leave_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ LOANS: add EMI pause + employee_name snapshot ============
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS paused_until date,
  ADD COLUMN IF NOT EXISTS pre_pause_emi bigint;

-- ============ ADVANCES: add advance_name + amount_used + reminders ============
ALTER TABLE public.advances
  ADD COLUMN IF NOT EXISTS advance_name text,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS amount_used bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_spend_date date,
  ADD COLUMN IF NOT EXISTS settlement_due_date date,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS last_reminder_sent timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_history jsonb NOT NULL DEFAULT '[]'::jsonb;