-- Add producto_id to configuracion_workflows table
ALTER TABLE configuracion_workflows
ADD COLUMN producto_id INTEGER REFERENCES productos_cliente(id);

-- Rename all dias_* columns to horas_* and multiply existing values by 24
-- First, add new columns with hour values
ALTER TABLE configuracion_workflows
ADD COLUMN horas_verificacion_recepcion_receptor INTEGER,
ADD COLUMN horas_recordatorio_receptor INTEGER,
ADD COLUMN horas_escalamiento INTEGER,
ADD COLUMN horas_declarar_extravio INTEGER,
ADD COLUMN horas_segunda_verificacion_receptor INTEGER;

-- Copy data from days to hours (multiply by 24)
UPDATE configuracion_workflows
SET 
  horas_verificacion_recepcion_receptor = dias_verificacion_recepcion * 24,
  horas_recordatorio_receptor = dias_recordatorio * 24,
  horas_escalamiento = dias_escalamiento * 24,
  horas_declarar_extravio = dias_declarar_extravio * 24,
  horas_segunda_verificacion_receptor = CASE 
    WHEN dias_segunda_verificacion IS NOT NULL THEN dias_segunda_verificacion * 24
    ELSE NULL
  END;

-- Drop old day columns
ALTER TABLE configuracion_workflows
DROP COLUMN dias_verificacion_recepcion,
DROP COLUMN dias_recordatorio,
DROP COLUMN dias_escalamiento,
DROP COLUMN dias_declarar_extravio,
DROP COLUMN dias_segunda_verificacion;

-- Set NOT NULL constraints on required hour columns
ALTER TABLE configuracion_workflows
ALTER COLUMN horas_verificacion_recepcion_receptor SET NOT NULL,
ALTER COLUMN horas_recordatorio_receptor SET NOT NULL,
ALTER COLUMN horas_escalamiento SET NOT NULL,
ALTER COLUMN horas_declarar_extravio SET NOT NULL;