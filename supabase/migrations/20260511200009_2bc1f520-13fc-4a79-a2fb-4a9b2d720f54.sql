ALTER TABLE public.buildings
ADD COLUMN IF NOT EXISTS summary_pros text,
ADD COLUMN IF NOT EXISTS summary_cons text;