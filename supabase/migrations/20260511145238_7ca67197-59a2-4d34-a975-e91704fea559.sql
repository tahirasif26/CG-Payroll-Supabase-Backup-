
CREATE POLICY "feature approvers select asset_requests"
ON public.asset_requests
FOR SELECT
TO authenticated
USING (
  client_id = public.get_user_client_id(auth.uid())
  AND public.has_feature(auth.uid(), 'assets.approve_requests')
);

CREATE POLICY "feature approvers update asset_requests"
ON public.asset_requests
FOR UPDATE
TO authenticated
USING (
  client_id = public.get_user_client_id(auth.uid())
  AND public.has_feature(auth.uid(), 'assets.approve_requests')
)
WITH CHECK (
  client_id = public.get_user_client_id(auth.uid())
  AND public.has_feature(auth.uid(), 'assets.approve_requests')
);
