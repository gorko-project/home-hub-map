
-- Storage bucket for building photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('building-photos', 'building-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Building photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'building-photos');

-- Admins can upload
CREATE POLICY "Admins can upload building photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'building-photos' AND public.has_role(auth.uid(), 'admin'));

-- Admins can update
CREATE POLICY "Admins can update building photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'building-photos' AND public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete building photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'building-photos' AND public.has_role(auth.uid(), 'admin'));

-- Allow authenticated users to grant themselves the admin role (bootstrap).
-- Restrict so users can only insert their own user_id.
CREATE POLICY "Users can self-assign admin role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
