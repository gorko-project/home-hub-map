
-- Roles enum + table (so we can gate admin writes properly)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Buildings
CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT,
  neighborhood TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  status TEXT NOT NULL DEFAULT 'draft',
  admin_notes TEXT,
  photo_url TEXT,
  composite_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published buildings" ON public.buildings
  FOR SELECT USING (status = 'published');
CREATE POLICY "Admins view all buildings" ON public.buildings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert buildings" ON public.buildings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update buildings" ON public.buildings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete buildings" ON public.buildings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Building scores
CREATE TABLE public.building_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  management INTEGER CHECK (management BETWEEN 1 AND 10),
  noise INTEGER CHECK (noise BETWEEN 1 AND 10),
  value INTEGER CHECK (value BETWEEN 1 AND 10),
  location INTEGER CHECK (location BETWEEN 1 AND 10),
  condition INTEGER CHECK (condition BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.building_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view scores of published buildings" ON public.building_scores
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = building_id AND b.status = 'published'));
CREATE POLICY "Admins view all scores" ON public.building_scores
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert scores" ON public.building_scores
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update scores" ON public.building_scores
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete scores" ON public.building_scores
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
