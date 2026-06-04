
-- 1) client-logos storage policies: enforce tenant folder ownership on writes
DROP POLICY IF EXISTS "client-logos authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "client-logos authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "client-logos authenticated delete" ON storage.objects;

CREATE POLICY "client-logos tenant insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-logos'
    AND (storage.foldername(name))[1] = (public.get_user_client_id(auth.uid()))::text
  );

CREATE POLICY "client-logos tenant update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-logos'
    AND (storage.foldername(name))[1] = (public.get_user_client_id(auth.uid()))::text
  )
  WITH CHECK (
    bucket_id = 'client-logos'
    AND (storage.foldername(name))[1] = (public.get_user_client_id(auth.uid()))::text
  );

CREATE POLICY "client-logos tenant delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-logos'
    AND (storage.foldername(name))[1] = (public.get_user_client_id(auth.uid()))::text
  );

-- 2) Privilege escalation: remove custom-role branch from is_admin_or_hr_in_client / is_client_staff
CREATE OR REPLACE FUNCTION public.is_admin_or_hr_in_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _client_id = public.get_user_client_id(_user_id)
  AND (
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'hr')
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_client_staff(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _client_id = public.get_user_client_id(_user_id)
  AND (
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'hr')
    OR public.has_role(_user_id, 'employee')
  );
$function$;

-- 3) Payroll lines: drop broad client-member read; keep own + admin/HR
DROP POLICY IF EXISTS "client members read payroll_lines" ON public.payroll_lines;

-- 4) Payroll runs: drop broad client-member read (admins/HR keep full access)
DROP POLICY IF EXISTS "client members read payroll_runs" ON public.payroll_runs;

-- 5) Separations: drop broad client-member read; keep own + admin/HR
DROP POLICY IF EXISTS "client members read separations" ON public.separations;

-- 6) Approval history inserts: restrict to requester, assignee, or admin/HR
DROP POLICY IF EXISTS "rah_insert" ON public.request_approval_history;

CREATE POLICY "rah_insert" ON public.request_approval_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.request_approvals r
      WHERE r.id = request_approval_history.request_approval_id
        AND (
          public.is_admin_or_hr_in_client(auth.uid(), r.client_id)
          OR r.requester_employee_id IN (
            SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid()
          )
          OR public.can_act_on_request(auth.uid(), r.id)
        )
    )
  );
