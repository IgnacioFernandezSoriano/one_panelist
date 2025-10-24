-- Drop the old check constraint
ALTER TABLE configuracion_workflows
DROP CONSTRAINT IF EXISTS configuracion_workflows_tipo_dias_check;

-- Add new check constraint with correct values
ALTER TABLE configuracion_workflows
ADD CONSTRAINT configuracion_workflows_tipo_dias_check 
CHECK (tipo_dias IN ('habiles', 'calendario'));

COMMENT ON CONSTRAINT configuracion_workflows_tipo_dias_check ON configuracion_workflows 
IS 'Validates day type: habiles (business days) or calendario (calendar days)';