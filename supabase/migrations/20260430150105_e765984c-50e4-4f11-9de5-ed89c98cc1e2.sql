-- Consolidate duplicate policy ack tables.
-- Two tables existed: policy_acknowledgments (single 'e') and policy_acknowledgements (double 'e').
-- Both are empty. Keep policy_acknowledgements (correct spelling, has proper FKs and admin/HR RLS).
-- Drop the misspelled duplicate.
DROP TABLE IF EXISTS public.policy_acknowledgments;