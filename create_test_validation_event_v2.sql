-- Create a test event that will fail validation
-- This script first checks for existing plans and uses one

-- Step 1: Check existing plans for cliente_id = 13 (DEMO)
SELECT id, cliente_id, created_at 
FROM public.generated_allocation_plans 
WHERE cliente_id = 13 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 2: Insert test event using an existing plan_id
-- Replace <PLAN_ID> with one of the IDs from the query above
-- Or use this query that automatically gets the latest plan:

WITH latest_plan AS (
  SELECT id 
  FROM public.generated_allocation_plans 
  WHERE cliente_id = 13 
  ORDER BY created_at DESC 
  LIMIT 1
)
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
SELECT 
  latest_plan.id, -- plan_id from the latest plan
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
FROM latest_plan;

-- Step 3: Run the validation function to move it to pending validation
SELECT validate_and_move_to_eventos_reales();

-- Step 4: Check the result
SELECT 
  id,
  allocation_plan_detail_id,
  estado,
  validaciones_fallidas,
  created_at
FROM public.allocation_plan_validacion_pendiente
ORDER BY created_at DESC
LIMIT 3;

-- Step 5: Verify the event details
SELECT 
  apd.id,
  apd.status,
  apd.nodo_origen,
  apd.nodo_destino,
  apd.numero_etiqueta,
  apd.fecha_envio_real,
  apd.fecha_recepcion_real
FROM public.generated_allocation_plan_details apd
WHERE apd.status = 'VALIDATION_FAILED'
ORDER BY apd.id DESC
LIMIT 1;
