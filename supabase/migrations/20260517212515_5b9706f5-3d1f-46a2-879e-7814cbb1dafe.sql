ALTER TABLE public.building_scores 
  ADD COLUMN management_rationale TEXT NULL,
  ADD COLUMN noise_rationale TEXT NULL,
  ADD COLUMN value_rationale TEXT NULL,
  ADD COLUMN location_rationale TEXT NULL,
  ADD COLUMN condition_rationale TEXT NULL;