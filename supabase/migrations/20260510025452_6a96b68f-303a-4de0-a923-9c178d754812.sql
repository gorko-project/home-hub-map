
-- Convert building_scores to numeric(3,2) and divide by 2
ALTER TABLE public.building_scores
  ALTER COLUMN management TYPE numeric(3,2) USING (management::numeric / 2),
  ALTER COLUMN noise TYPE numeric(3,2) USING (noise::numeric / 2),
  ALTER COLUMN value TYPE numeric(3,2) USING (value::numeric / 2),
  ALTER COLUMN location TYPE numeric(3,2) USING (location::numeric / 2),
  ALTER COLUMN condition TYPE numeric(3,2) USING (condition::numeric / 2);

-- Convert composite_score on buildings
UPDATE public.buildings
SET composite_score = ROUND((composite_score / 2)::numeric, 2)
WHERE composite_score IS NOT NULL;

-- Convert building_reviews ratings from 1-10 to 1-5 (round to nearest whole star, min 1)
UPDATE public.building_reviews
SET overall = GREATEST(1, ROUND(overall::numeric / 2))::smallint,
    management = GREATEST(1, ROUND(management::numeric / 2))::smallint,
    quietness = GREATEST(1, ROUND(quietness::numeric / 2))::smallint,
    value_for_money = GREATEST(1, ROUND(value_for_money::numeric / 2))::smallint,
    location = GREATEST(1, ROUND(location::numeric / 2))::smallint,
    building_condition = GREATEST(1, ROUND(building_condition::numeric / 2))::smallint;
