-- Enable extensions needed for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Dedup log: prevents the cron from sending the same reminder twice in one day
CREATE TABLE IF NOT EXISTS public.reminder_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid,
  reminder_key text NOT NULL,        -- e.g. "doc_expiry:<doc_id>:30"
  category text NOT NULL,            -- document | probation | asset | loan | advance | policy
  entity_type text,
  entity_id uuid,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (reminder_key)
);

ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all reminder_log"
ON public.reminder_log FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_reminder_log_sent_at ON public.reminder_log(sent_at DESC);

-- Policy acknowledgments
CREATE TABLE IF NOT EXISTS public.policy_acknowledgments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  policy_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  user_id uuid NOT NULL,
  acknowledged_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (policy_id, employee_id)
);

ALTER TABLE public.policy_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee insert own ack"
ON public.policy_acknowledgments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "employee select own ack"
ON public.policy_acknowledgments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "super admin all acks"
ON public.policy_acknowledgments FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_policy_ack_policy ON public.policy_acknowledgments(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_employee ON public.policy_acknowledgments(employee_id);
