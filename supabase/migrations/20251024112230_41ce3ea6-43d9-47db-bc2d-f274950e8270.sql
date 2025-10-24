-- Add standard delivery time to products table
ALTER TABLE productos_cliente
ADD COLUMN standard_delivery_hours INTEGER;

COMMENT ON COLUMN productos_cliente.standard_delivery_hours IS 'Standard delivery time in hours for this product type';

-- Restructure workflow configuration table for sender and receiver flows
ALTER TABLE configuracion_workflows
DROP COLUMN horas_verificacion_recepcion_receptor,
DROP COLUMN horas_recordatorio_receptor,
DROP COLUMN horas_escalamiento,
DROP COLUMN horas_declarar_extravio,
DROP COLUMN horas_segunda_verificacion_receptor;

-- Add new sender (emisor) fields
ALTER TABLE configuracion_workflows
ADD COLUMN hours_sender_first_reminder INTEGER NOT NULL DEFAULT 24,
ADD COLUMN hours_sender_second_reminder INTEGER NOT NULL DEFAULT 48,
ADD COLUMN hours_sender_escalation INTEGER NOT NULL DEFAULT 72;

-- Add new receiver (receptor) fields  
ALTER TABLE configuracion_workflows
ADD COLUMN hours_receiver_verification INTEGER NOT NULL DEFAULT 48,
ADD COLUMN hours_receiver_escalation INTEGER NOT NULL DEFAULT 72;

COMMENT ON COLUMN configuracion_workflows.hours_sender_first_reminder IS 'Hours after due date to send first reminder to sender';
COMMENT ON COLUMN configuracion_workflows.hours_sender_second_reminder IS 'Hours after first reminder to send second reminder to sender';
COMMENT ON COLUMN configuracion_workflows.hours_sender_escalation IS 'Hours after second reminder to escalate sender issue';
COMMENT ON COLUMN configuracion_workflows.hours_receiver_verification IS 'Hours after standard delivery time to request receiver verification';
COMMENT ON COLUMN configuracion_workflows.hours_receiver_escalation IS 'Hours after verification request to escalate receiver issue';