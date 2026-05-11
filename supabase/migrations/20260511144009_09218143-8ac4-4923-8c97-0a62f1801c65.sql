
-- Allow client admin/HR (and custom roles) full access to asset tables in their tenant; employees can read.

-- asset_categories
CREATE POLICY "client staff manage asset_categories" ON public.asset_categories
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "client members read asset_categories" ON public.asset_categories
  FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- asset_conditions
CREATE POLICY "client staff manage asset_conditions" ON public.asset_conditions
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "client members read asset_conditions" ON public.asset_conditions
  FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- asset_locations
CREATE POLICY "client staff manage asset_locations" ON public.asset_locations
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "client members read asset_locations" ON public.asset_locations
  FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- assets
CREATE POLICY "client staff manage assets" ON public.assets
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "client members read assets" ON public.assets
  FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- asset_store_items
CREATE POLICY "client staff manage asset_store_items" ON public.asset_store_items
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "client members read asset_store_items" ON public.asset_store_items
  FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- asset_requests (admin/hr manage all in tenant, employee policies already exist)
CREATE POLICY "client staff manage asset_requests" ON public.asset_requests
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

-- asset_audits
CREATE POLICY "client staff manage asset_audits" ON public.asset_audits
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

-- asset_audit_entries (scope via parent asset_audits.client_id)
CREATE POLICY "client staff manage asset_audit_entries" ON public.asset_audit_entries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.asset_audits a WHERE a.id = asset_audit_entries.audit_id AND public.is_admin_or_hr_in_client(auth.uid(), a.client_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.asset_audits a WHERE a.id = asset_audit_entries.audit_id AND public.is_admin_or_hr_in_client(auth.uid(), a.client_id)));

-- asset_history (scope via parent assets.client_id)
CREATE POLICY "client staff manage asset_history" ON public.asset_history
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_history.asset_id AND public.is_admin_or_hr_in_client(auth.uid(), a.client_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_history.asset_id AND public.is_admin_or_hr_in_client(auth.uid(), a.client_id)));
