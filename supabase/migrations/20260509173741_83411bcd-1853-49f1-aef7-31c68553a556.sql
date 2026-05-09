
CREATE POLICY "Client staff can view their client"
ON public.clients FOR SELECT
USING (id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Client admins can update their client"
ON public.clients FOR UPDATE
USING (id = public.get_user_client_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (id = public.get_user_client_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
