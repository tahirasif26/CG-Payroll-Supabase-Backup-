CREATE TABLE public.assessment_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  description text,
  color text NOT NULL DEFAULT 'bg-muted text-muted-foreground',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin/hr manage assessment_ratings"
  ON public.assessment_ratings FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "super_admin all assessment_ratings"
  ON public.assessment_ratings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "users select assessment_ratings"
  ON public.assessment_ratings FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE TRIGGER update_assessment_ratings_updated_at
  BEFORE UPDATE ON public.assessment_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_assessment_ratings_client ON public.assessment_ratings(client_id);