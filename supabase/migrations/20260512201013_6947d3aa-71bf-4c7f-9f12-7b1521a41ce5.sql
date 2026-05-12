
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS walk_score integer,
  ADD COLUMN IF NOT EXISTS transit_score integer,
  ADD COLUMN IF NOT EXISTS bike_score integer,
  ADD COLUMN IF NOT EXISTS building_amenities text,
  ADD COLUMN IF NOT EXISTS unit_features text;

CREATE TABLE IF NOT EXISTS public.building_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  url text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_building_photos_building_id ON public.building_photos(building_id);

ALTER TABLE public.building_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view photos of published buildings"
  ON public.building_photos
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = building_photos.building_id AND b.status = 'published'));

CREATE POLICY "Admins view all photos"
  ON public.building_photos
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert photos"
  ON public.building_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update photos"
  ON public.building_photos
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete photos"
  ON public.building_photos
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
