-- Fix function search path security issue
CREATE OR REPLACE FUNCTION validate_classification_matrix_sum()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_sum NUMERIC;
BEGIN
  -- Calculate total sum of all cells for this cliente
  SELECT 
    SUM(percentage_from_a + percentage_from_b + percentage_from_c)
  INTO total_sum
  FROM classification_allocation_matrix
  WHERE cliente_id = NEW.cliente_id;

  -- Verify total sum equals 100%
  IF ABS(total_sum - 100) > 0.1 THEN
    RAISE EXCEPTION 'Total matrix sum must equal 100 percent, current sum is %', total_sum;
  END IF;

  RETURN NEW;
END;
$$;