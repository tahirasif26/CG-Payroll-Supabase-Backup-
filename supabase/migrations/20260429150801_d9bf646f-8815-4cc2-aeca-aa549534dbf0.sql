CREATE OR REPLACE FUNCTION public.seed_default_reminder_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.reminder_rules (client_id, category, name, description, lead_days_before, repeat_frequency, recipients, priority) VALUES
    (NEW.id, 'document_expiry', 'Document Expiry', 'Notify employee + HR before passport/visa/ID expires', ARRAY[30, 15, 7], 'once', ARRAY['employee','hr'], 'warning'),
    (NEW.id, 'visa_expiry', 'Visa Expiry', 'Notify HR + employee before work visa expires', ARRAY[60, 30, 7], 'once', ARRAY['employee','hr'], 'urgent'),
    (NEW.id, 'iqama_expiry', 'Iqama / Residence Permit', 'Notify HR + employee before Iqama / residence permit expires', ARRAY[60, 30, 7], 'once', ARRAY['employee','hr'], 'urgent'),
    (NEW.id, 'contract_expiry', 'Contract End Date', 'Notify HR + manager before employment contract ends', ARRAY[60, 30, 7], 'once', ARRAY['hr','manager'], 'warning'),
    (NEW.id, 'medical_insurance', 'Medical Insurance', 'Notify HR + employee before medical insurance expires', ARRAY[30, 7], 'once', ARRAY['employee','hr'], 'warning'),
    (NEW.id, 'loan_instalment', 'Loan Instalment Due', 'Notify employee about upcoming loan instalment deduction', ARRAY[3, 1], 'once', ARRAY['employee'], 'info'),
    (NEW.id, 'leave_balance_lapse', 'Leave Balance Lapse', 'Notify employees about leave balance that will lapse at year-end', ARRAY[60, 30, 7], 'once', ARRAY['employee','hr'], 'warning'),
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
$function$;