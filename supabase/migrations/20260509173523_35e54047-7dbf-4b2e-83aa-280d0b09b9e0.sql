
CREATE POLICY "client-logos authenticated insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client-logos');

CREATE POLICY "client-logos authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'client-logos');

CREATE POLICY "client-logos authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client-logos');
