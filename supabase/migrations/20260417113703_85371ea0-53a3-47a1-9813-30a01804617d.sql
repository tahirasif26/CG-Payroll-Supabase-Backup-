-- ============================================================
-- 1. Schema additions
-- ============================================================
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS image_url text;

-- payslips table may or may not have these; add safely
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payslips') THEN
    ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS pdf_url text;
    ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS issued_at timestamptz;
  END IF;
END $$;

-- ============================================================
-- 2. Buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('client-logos', 'client-logos', true),
  ('employee-documents', 'employee-documents', false),
  ('expense-receipts', 'expense-receipts', false),
  ('asset-images', 'asset-images', false),
  ('payslips', 'payslips', false),
  ('company-policies', 'company-policies', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Helper: extract client_id (1st folder) and entity_id (2nd folder)
--    Path convention: {client_id}/{entity_id}/{filename...}
-- ============================================================

-- ============================================================
-- 4. Policies
-- ============================================================

-- ---------- AVATARS (public read) ----------
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars users write own" ON storage.objects;
CREATE POLICY "avatars users write own" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      public.is_super_admin(auth.uid())
      OR (storage.foldername(name))[1] = (public.get_user_client_id(auth.uid()))::text
    )
  );

DROP POLICY IF EXISTS "avatars users update own" ON storage.objects;
CREATE POLICY "avatars users update own" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (
      public.is_super_admin(auth.uid())
      OR (storage.foldername(name))[1] = (public.get_user_client_id(auth.uid()))::text
    )
  );

DROP POLICY IF EXISTS "avatars users delete own" ON storage.objects;
CREATE POLICY "avatars users delete own" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (
      public.is_super_admin(auth.uid())
      OR (storage.foldername(name))[1] = (public.get_user_client_id(auth.uid()))::text
    )
  );

-- ---------- CLIENT-LOGOS (public read, admin write) ----------
DROP POLICY IF EXISTS "client-logos public read" ON storage.objects;
CREATE POLICY "client-logos public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'client-logos');

DROP POLICY IF EXISTS "client-logos admin write" ON storage.objects;
CREATE POLICY "client-logos admin write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-logos'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        (storage.foldername(name))[1] = (public.get_user_client_id(auth.uid()))::text
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
      )
    )
  );

DROP POLICY IF EXISTS "client-logos admin update" ON storage.objects;
CREATE POLICY "client-logos admin update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'client-logos'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        (storage.foldername(name))[1] = (public.get_user_client_id(auth.uid()))::text
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
      )
    )
  );

DROP POLICY IF EXISTS "client-logos admin delete" ON storage.objects;
CREATE POLICY "client-logos admin delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-logos'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        (storage.foldername(name))[1] = (public.get_user_client_id(auth.uid()))::text
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
      )
    )
  );

-- ---------- EMPLOYEE-DOCUMENTS (private) ----------
DROP POLICY IF EXISTS "employee-documents read" ON storage.objects;
CREATE POLICY "employee-documents read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'employee-documents'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "employee-documents write" ON storage.objects;
CREATE POLICY "employee-documents write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "employee-documents update" ON storage.objects;
CREATE POLICY "employee-documents update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'employee-documents'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "employee-documents delete" ON storage.objects;
CREATE POLICY "employee-documents delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'employee-documents'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
    )
  );

-- ---------- EXPENSE-RECEIPTS (private) ----------
DROP POLICY IF EXISTS "expense-receipts read" ON storage.objects;
CREATE POLICY "expense-receipts read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'expense-receipts'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "expense-receipts write" ON storage.objects;
CREATE POLICY "expense-receipts write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'expense-receipts'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "expense-receipts delete" ON storage.objects;
CREATE POLICY "expense-receipts delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'expense-receipts'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
    )
  );

-- ---------- ASSET-IMAGES (client-private) ----------
DROP POLICY IF EXISTS "asset-images read" ON storage.objects;
CREATE POLICY "asset-images read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'asset-images'
    AND (
      public.is_super_admin(auth.uid())
      OR (storage.foldername(name))[1] = (public.get_user_client_id(auth.uid()))::text
    )
  );

DROP POLICY IF EXISTS "asset-images write" ON storage.objects;
CREATE POLICY "asset-images write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'asset-images'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

DROP POLICY IF EXISTS "asset-images update" ON storage.objects;
CREATE POLICY "asset-images update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'asset-images'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

DROP POLICY IF EXISTS "asset-images delete" ON storage.objects;
CREATE POLICY "asset-images delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'asset-images'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

-- ---------- PAYSLIPS (private; employee + admin/hr) ----------
DROP POLICY IF EXISTS "payslips read" ON storage.objects;
CREATE POLICY "payslips read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payslips'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
    )
  );

-- Writes to payslips bucket happen via edge function with service role; no client write policy.

-- ---------- COMPANY-POLICIES (read by client, write by admin/hr) ----------
DROP POLICY IF EXISTS "company-policies read" ON storage.objects;
CREATE POLICY "company-policies read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'company-policies'
    AND (
      public.is_super_admin(auth.uid())
      OR (storage.foldername(name))[1] = (public.get_user_client_id(auth.uid()))::text
    )
  );

DROP POLICY IF EXISTS "company-policies write" ON storage.objects;
CREATE POLICY "company-policies write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-policies'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

DROP POLICY IF EXISTS "company-policies update" ON storage.objects;
CREATE POLICY "company-policies update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'company-policies'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

DROP POLICY IF EXISTS "company-policies delete" ON storage.objects;
CREATE POLICY "company-policies delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'company-policies'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_admin_or_hr_in_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );
