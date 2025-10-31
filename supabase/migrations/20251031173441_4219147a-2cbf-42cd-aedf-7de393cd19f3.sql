-- Add new percentage columns to city_allocation_requirements
ALTER TABLE public.city_allocation_requirements 
  ADD COLUMN percentage_from_a DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN percentage_from_b DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN percentage_from_c DECIMAL(5,2) DEFAULT 0;

-- Migrate existing data (convert absolute values to percentages)
UPDATE public.city_allocation_requirements
SET 
  percentage_from_a = CASE 
    WHEN (from_classification_a + from_classification_b + from_classification_c) > 0 
    THEN ROUND((from_classification_a::decimal / (from_classification_a + from_classification_b + from_classification_c)) * 100, 2)
    ELSE 33.33
  END,
  percentage_from_b = CASE 
    WHEN (from_classification_a + from_classification_b + from_classification_c) > 0 
    THEN ROUND((from_classification_b::decimal / (from_classification_a + from_classification_b + from_classification_c)) * 100, 2)
    ELSE 33.33
  END,
  percentage_from_c = CASE 
    WHEN (from_classification_a + from_classification_b + from_classification_c) > 0 
    THEN ROUND((from_classification_c::decimal / (from_classification_a + from_classification_b + from_classification_c)) * 100, 2)
    ELSE 33.34
  END;

-- Drop old columns
ALTER TABLE public.city_allocation_requirements 
  DROP COLUMN from_classification_a,
  DROP COLUMN from_classification_b,
  DROP COLUMN from_classification_c;

-- Add constraint to validate sum = 100
ALTER TABLE public.city_allocation_requirements
  ADD CONSTRAINT check_percentages_sum_100 
  CHECK (ABS((percentage_from_a + percentage_from_b + percentage_from_c) - 100) < 0.1);