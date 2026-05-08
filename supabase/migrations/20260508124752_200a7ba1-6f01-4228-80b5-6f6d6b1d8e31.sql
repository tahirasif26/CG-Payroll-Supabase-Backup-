-- Add RLS policies for company_policies table
-- The table already exists; we are adding client-scoped access rules.

-- Client staff can view policies in their client
CREATE POLICY "Client staff can view company policies"
  ON public.company_policies FOR SELECT TO authenticated
  USING (public.is_client_staff(auth.uid(), client_id));

-- Client admins and HR can create policies
CREATE POLICY "Client admins and HR can create company policies"
  ON public.company_policies FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

-- Client admins and HR can update policies in their client
CREATE POLICY "Client admins and HR can update company policies"
  ON public.company_policies FOR UPDATE TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

-- Client admins and HR can delete policies in their client
CREATE POLICY "Client admins and HR can delete company policies"
  ON public.company_policies FOR DELETE TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id));