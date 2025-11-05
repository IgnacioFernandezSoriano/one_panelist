SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'generated_allocation_plan_details'
ORDER BY ordinal_position;
