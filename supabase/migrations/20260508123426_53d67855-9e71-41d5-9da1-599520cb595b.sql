CREATE TABLE IF NOT EXISTS public.separations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id             uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  separation_type         text NOT NULL DEFAULT 'resignation'
                          CHECK (separation_type IN ('resignation','termination','retirement','contract_end','death','other')),
  last_working_day        date NOT NULL,
  notice_period_days      int NOT NULL DEFAULT 30,
  notice_served_days      int NOT NULL DEFAULT 0,
  reason                  text,
  status                  text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','processing','completed','cancelled')),
  final_settlement_amount numeric(15,2),
  settlement_paid_on      date,
  assets_returned         boolean NOT NULL DEFAULT false,
  clearance_done          boolean NOT NULL DEFAULT false,
  exit_interview_done     boolean NOT NULL DEFAULT false,
  notes                   text,
  created_by              uuid REFERENCES public.profiles(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_separations_client ON public.separations(client_id);
CREATE INDEX IF NOT EXISTS idx_separations_employee ON public.separations(employee_id);

ALTER TABLE public.separations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client members read separations"
  ON public.separations FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "client admins manage separations"
  ON public.separations FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE TRIGGER update_separations_updated_at
  BEFORE UPDATE ON public.separations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();