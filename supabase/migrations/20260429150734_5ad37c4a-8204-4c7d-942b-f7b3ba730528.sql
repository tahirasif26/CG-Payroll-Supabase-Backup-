-- 1. Add new reminder categories
ALTER TYPE public.reminder_category ADD VALUE IF NOT EXISTS 'visa_expiry';
ALTER TYPE public.reminder_category ADD VALUE IF NOT EXISTS 'iqama_expiry';
ALTER TYPE public.reminder_category ADD VALUE IF NOT EXISTS 'contract_expiry';
ALTER TYPE public.reminder_category ADD VALUE IF NOT EXISTS 'medical_insurance';
ALTER TYPE public.reminder_category ADD VALUE IF NOT EXISTS 'loan_instalment';
ALTER TYPE public.reminder_category ADD VALUE IF NOT EXISTS 'leave_balance_lapse';

-- 2. Drop deprecated reminder_settings table (replaced by reminder_rules)
DROP TABLE IF EXISTS public.reminder_settings CASCADE;