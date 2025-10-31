-- Add missing columns to generated_allocation_plans table
ALTER TABLE generated_allocation_plans
  ADD COLUMN IF NOT EXISTS max_events_per_week integer,
  ADD COLUMN IF NOT EXISTS unassigned_events integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unassigned_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS generation_params jsonb;

-- Add comments to document the columns
COMMENT ON COLUMN generated_allocation_plans.max_events_per_week IS 
  'Maximum number of events allowed per week per panelist (from client configuration)';

COMMENT ON COLUMN generated_allocation_plans.unassigned_events IS 
  'Total number of events that could not be assigned due to capacity constraints';

COMMENT ON COLUMN generated_allocation_plans.unassigned_breakdown IS 
  'JSON array with unassigned events breakdown by city: [{ciudad_id, ciudad_nombre, deficit}]';

COMMENT ON COLUMN generated_allocation_plans.generation_params IS 
  'Algorithm parameters and metadata: {algorithm_version, timestamp, etc.}';