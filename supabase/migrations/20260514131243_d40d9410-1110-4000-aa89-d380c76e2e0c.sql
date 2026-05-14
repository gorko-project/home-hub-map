ALTER TABLE public.building_reviews ALTER COLUMN building_condition DROP NOT NULL;
ALTER TABLE public.building_reviews ALTER COLUMN management DROP NOT NULL;
ALTER TABLE public.building_reviews ALTER COLUMN quietness DROP NOT NULL;
ALTER TABLE public.building_reviews ALTER COLUMN value_for_money DROP NOT NULL;
ALTER TABLE public.building_reviews ALTER COLUMN location DROP NOT NULL;
ALTER TABLE public.building_reviews ALTER COLUMN comment DROP NOT NULL;