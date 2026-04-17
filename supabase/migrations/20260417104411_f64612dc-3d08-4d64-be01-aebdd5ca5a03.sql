-- Receipts bucket for expense receipt uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies: users access only their own folder (path: <user_id>/<filename>)
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own receipts"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin/HR can view all receipts in their client (via expenses join check would be expensive;
-- here we allow any authenticated admin/hr to read - approval workflow needs it)
CREATE POLICY "Admin HR view all receipts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts' AND (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') OR is_super_admin(auth.uid())
  )
);