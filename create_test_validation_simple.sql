-- Simple approach: Create test event directly in allocation_plan_validacion_pendiente
-- This bypasses the automatic validation function

-- Step 1: First, create a simple allocation plan detail event in VALIDATION_FAILED status
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
  NULL, -- plan_id can be NULL for test events
  13, -- cliente_id (DEMO)
  'TEST-ORIGIN', -- nodo_origen
  'TEST-DEST', -- nodo_destino
  '2025-11-10', -- fecha_programada
  NULL, -- producto_id can be NULL
  NULL, -- carrier_id can be NULL
  'VALIDATION_FAILED', -- status
  NULL, -- numero_etiqueta (missing - VAL001)
  '2025-11-06 10:00:00+00', -- fecha_envio_real
  '2025-11-08 14:00:00+00' -- fecha_recepcion_real
)
RETURNING id;

-- Step 2: Insert into allocation_plan_validacion_pendiente
-- Replace <EVENT_ID> with the id returned from the previous INSERT
INSERT INTO public.allocation_plan_validacion_pendiente (
  allocation_plan_detail_id,
  cliente_id,
  validaciones_fallidas,
  estado
)
VALUES (
  <EVENT_ID>, -- Use the id from the previous INSERT
  13, -- cliente_id (DEMO)
  '[
    {
      "codigo": "VAL001",
      "severidad": "critical",
      "campo": "numero_etiqueta",
      "descripcion": "Tracking number is missing",
      "detalle": "The event must have a valid tracking number before it can be validated and moved to the quality database."
    }
  ]'::jsonb,
  'pending_review'
);

-- Step 3: Verify the test event was created
SELECT 
  v.id,
  v.allocation_plan_detail_id,
  v.estado,
  v.validaciones_fallidas,
  d.nodo_origen,
  d.nodo_destino,
  d.numero_etiqueta,
  d.status
FROM public.allocation_plan_validacion_pendiente v
JOIN public.generated_allocation_plan_details d ON v.allocation_plan_detail_id = d.id
WHERE v.cliente_id = 13
ORDER BY v.created_at DESC
LIMIT 1;
