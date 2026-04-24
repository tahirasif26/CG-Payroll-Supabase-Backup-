-- Enum for reminder categories
CREATE TYPE public.reminder_category AS ENUM (
  'document_expiry',
  'asset_warranty',
  'asset_service',
  'advance_settlement',
  'probation_end',
  'birthday',
  'work_anniversary',
  'policy_ack',
  'approval_pending',
  'payroll_due',
  'performance_assessment'
);

CREATE TYPE public.reminder_frequency AS ENUM ('once', 'daily', 'weekly', 'monthly');
CREATE TYPE public.reminder_priority AS ENUM ('info', 'warning', 'urgent');

-- Reminder rules table
CREATE TABLE public.reminder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category public.reminder_category NOT NULL,
  name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT true,
  lead_days_before integer[] NOT NULL DEFAULT ARRAY[7]::integer[],
  repeat_frequency public.reminder_frequency NOT NULL DEFAULT 'once',
  recipients text[] NOT NULL DEFAULT ARRAY['employee']::text[],
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority public.reminder_priority NOT NULL DEFAULT 'info',
  last_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminder_rules_client ON public.reminder_rules(client_id);
CREATE INDEX idx_reminder_rules_enabled ON public.reminder_rules(client_id, is_enabled) WHERE is_enabled = true;

ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage own client reminder rules"
ON public.reminder_rules FOR ALL TO authenticated
USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "super admin all reminder rules"
ON public.reminder_rules FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_reminder_rules_updated_at
BEFORE UPDATE ON public.reminder_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Dispatch log (deduplication + audit)
CREATE TABLE public.reminder_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.reminder_rules(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  recipient_user_id uuid NOT NULL,
  notification_id uuid,
  lead_days_used integer NOT NULL DEFAULT 0,
  dispatch_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_reminder_dispatch_key ON public.reminder_dispatches(dispatch_key);
CREATE INDEX idx_reminder_dispatches_rule ON public.reminder_dispatches(rule_id);
CREATE INDEX idx_reminder_dispatches_client ON public.reminder_dispatches(client_id);

ALTER TABLE public.reminder_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins view own client dispatches"
ON public.reminder_dispatches FOR SELECT TO authenticated
USING (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "super admin all dispatches"
ON public.reminder_dispatches FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Seed default rules when a new client is created
CREATE OR REPLACE FUNCTION public.seed_default_reminder_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.reminder_rules (client_id, category, name, description, lead_days_before, repeat_frequency, recipients, priority) VALUES
    (NEW.id, 'document_expiry', 'Document Expiry', 'Notify employee + HR before passport/visa/ID expires', ARRAY[30, 15, 7], 'once', ARRAY['employee','hr'], 'warning'),
    (NEW.id, 'asset_warranty', 'Asset Warranty Expiry', 'Notify HR before asset warranty expires', ARRAY[30, 7], 'once', ARRAY['hr'], 'info'),
    (NEW.id, 'asset_service', 'Asset Service Due', 'Notify HR before asset service is due', ARRAY[14, 3], 'once', ARRAY['hr'], 'info'),
    (NEW.id, 'advance_settlement', 'Advance Settlement Due', 'Notify employee about pending advance settlement', ARRAY[7, 3, 1], 'once', ARRAY['employee','hr'], 'warning'),
    (NEW.id, 'probation_end', 'Probation Ending', 'Notify HR + manager before probation ends', ARRAY[14, 3], 'once', ARRAY['hr','manager'], 'warning'),
    (NEW.id, 'birthday', 'Birthday Reminder', 'Notify HR for upcoming birthdays', ARRAY[1], 'once', ARRAY['hr'], 'info'),
    (NEW.id, 'work_anniversary', 'Work Anniversary', 'Notify HR for upcoming work anniversaries', ARRAY[1], 'once', ARRAY['hr'], 'info'),
    (NEW.id, 'policy_ack', 'Policy Acknowledgement Pending', 'Remind employees to acknowledge policies', ARRAY[3], 'weekly', ARRAY['employee'], 'info'),
    (NEW.id, 'approval_pending', 'Pending Approvals', 'Remind approvers about pending requests', ARRAY[2], 'daily', ARRAY['approver'], 'warning'),
    (NEW.id, 'payroll_due', 'Payroll Run Due', 'Notify admins about upcoming payroll cycle', ARRAY[3, 1], 'once', ARRAY['admin'], 'warning'),
    (NEW.id, 'performance_assessment', 'Performance Assessment Due', 'Remind employees about pending assessments', ARRAY[7, 1], 'weekly', ARRAY['employee','manager'], 'info');
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_reminder_rules_on_client
AFTER INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.seed_default_reminder_rules();