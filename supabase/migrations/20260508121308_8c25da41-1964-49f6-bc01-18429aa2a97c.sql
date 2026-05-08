CREATE TABLE IF NOT EXISTS public.divisions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name       text NOT NULL,
  code       text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);

ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client members can read divisions"
  ON public.divisions FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "client admins can manage divisions"
  ON public.divisions FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "super admin all divisions"
  ON public.divisions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));