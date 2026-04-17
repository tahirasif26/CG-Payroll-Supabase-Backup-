-- Create a view aggregating client info with user counts
CREATE OR REPLACE VIEW public.client_stats
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.company_name,
  c.company_slug,
  c.company_email,
  c.company_phone,
  c.country,
  c.status,
  c.subscription_plan,
  c.timezone,
  c.base_currency,
  c.created_at,
  c.updated_at,
  c.created_by,
  COALESCE(p.user_count, 0) AS user_count,
  p.last_activity
FROM public.clients c
LEFT JOIN (
  SELECT
    client_id,
    COUNT(*)::int AS user_count,
    MAX(last_login_at) AS last_activity
  FROM public.profiles
  WHERE client_id IS NOT NULL
  GROUP BY client_id
) p ON p.client_id = c.id;

GRANT SELECT ON public.client_stats TO authenticated;