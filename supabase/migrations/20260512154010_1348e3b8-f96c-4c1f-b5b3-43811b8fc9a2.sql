ALTER TABLE public.approval_groups
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS min_limit_halalas bigint;