-- Drop the old per-row constraint
ALTER TABLE classification_allocation_matrix 
  DROP CONSTRAINT IF EXISTS check_classification_percentages_sum_100;

-- Create function to validate total matrix sum
CREATE OR REPLACE FUNCTION validate_classification_matrix_sum()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to check matrix total sum
CREATE TRIGGER check_matrix_total_sum
  AFTER INSERT OR UPDATE ON classification_allocation_matrix
  FOR EACH ROW
  EXECUTE FUNCTION validate_classification_matrix_sum();

-- Migrate existing data: divide by 3 to convert from 300% total to 100% total
UPDATE classification_allocation_matrix
SET 
  percentage_from_a = percentage_from_a / 3,
  percentage_from_b = percentage_from_b / 3,
  percentage_from_c = percentage_from_c / 3;