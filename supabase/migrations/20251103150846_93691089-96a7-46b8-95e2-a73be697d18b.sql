-- Add status column to generated_allocation_plan_details
ALTER TABLE generated_allocation_plan_details 
ADD COLUMN IF NOT EXISTS status estado_envio DEFAULT 'PENDING';

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_plan_details_status 
ON generated_allocation_plan_details(status);