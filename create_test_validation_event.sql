-- Create a test event that will fail validation
-- This event will be missing the tracking number (numero_etiqueta)
-- which will trigger validation error VAL001

-- Insert test event in RECEIVED status
INSERT INTO public.generated_allocation_plan_details (
  plan_id,
  cliente_id,
  nodo_origen,
  nodo_destino,
  fecha_programada,
  producto_id,
  carrier_id,
  status,
  numero_etiqueta,
  fecha_envio_real,
  fecha_recepcion_real
)
VALUES (
  1, -- plan_id (assuming plan 1 exists)
  13, -- cliente_id (DEMO client)
  '0001-0001-0001-0001', -- nodo_origen
  '0001-0001-0002-0001', -- nodo_destino
  '2025-11-10', -- fecha_programada
  1, -- producto_id
  1, -- carrier_id
  'RECEIVED', -- status (ready for validation)
  NULL, -- numero_etiqueta (missing - will fail VAL001)
  '2025-11-06 10:00:00+00', -- fecha_envio_real
  '2025-11-08 14:00:00+00' -- fecha_recepcion_real
);

-- Now run the validation function to move it to pending validation
SELECT validate_and_move_to_eventos_reales();

-- Check the result
SELECT 
  id,
  allocation_plan_detail_id,
  estado,
  validaciones_fallidas
FROM public.allocation_plan_validacion_pendiente
ORDER BY created_at DESC
LIMIT 1;
