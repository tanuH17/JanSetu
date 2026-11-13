-- ====================================================================
-- JanSetu Platform: Storage Bucket Setup & Security Policies
-- File: supabase/storage_setup.sql
-- Run in Supabase SQL Editor to enable avatar & complaint image uploads
-- ====================================================================

-- 1. Create storage buckets if they do not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('complaint-attachments', 'complaint-attachments', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Policies for Avatars
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Storage Policies for Complaint Attachments
DROP POLICY IF EXISTS "Public can view complaint attachments" ON storage.objects;
CREATE POLICY "Public can view complaint attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'complaint-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload complaint attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload complaint attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'complaint-attachments');

DROP POLICY IF EXISTS "Users can update own complaint attachments" ON storage.objects;
CREATE POLICY "Users can update own complaint attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'complaint-attachments');
