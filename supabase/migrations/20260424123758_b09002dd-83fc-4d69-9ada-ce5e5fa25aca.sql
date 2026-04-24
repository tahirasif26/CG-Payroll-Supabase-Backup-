-- Explicit deny for client-side writes; only super admin (service role bypasses RLS) writes
CREATE POLICY "no client-side insert dispatches"
ON public.reminder_dispatches FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "no client-side update dispatches"
ON public.reminder_dispatches FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "no client-side delete dispatches"
ON public.reminder_dispatches FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));