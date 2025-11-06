-- Create a test event that will fail validation
-- This script verifies all dependencies before inserting

-- Step 1: Verify all required data exists for cliente_id = 13 (DEMO)

-- Check if cliente exists
SELECT id, nombre FROM public.clientes WHERE id = 13;

-- Check available carriers for this client
SELECT id, nombre, cliente_id FROM public.carriers WHERE cliente_id = 13 LIMIT 5;

-- Check available products for this client
SELECT id, nombre, cliente_id FROM public.productos_cliente WHERE cliente_id = 13 LIMIT 5;

-- Check existing allocation plans
SELECT id, cliente_id, carrier_id, producto_id, created_at 
FROM public.generated_allocation_plans 
WHERE cliente_id = 13 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 2: Create the test event using existing valid references
-- This query automatically finds valid references and creates the test event

WITH valid_refs AS (
  SELECT 
    (SELECT id FROM public.generated_allocation_plans WHERE cliente_id = 13 ORDER BY created_at DESC LIMIT 1) as plan_id,
    (SELECT id FROM public.carriers WHERE cliente_id = 13 LIMIT 1) as carrier_id,
    (SELECT id FROM public.productos_cliente WHERE cliente_id = 13 LIMIT 1) as producto_id
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
  plan_id,
  13, -- cliente_id (DEMO client)
  '0001-0001-0001-0001', -- nodo_origen
  '0001-0001-0002-0001', -- nodo_destino
  '2025-11-10', -- fecha_programada
  producto_id,
  carrier_id,
  'RECEIVED', -- status (ready for validation)
  NULL, -- numero_etiqueta (missing - will fail VAL001)
  '2025-11-06 10:00:00+00', -- fecha_envio_real
  '2025-11-08 14:00:00+00' -- fecha_recepcion_real
FROM valid_refs
WHERE plan_id IS NOT NULL 
  AND carrier_id IS NOT NULL 
  AND producto_id IS NOT NULL;

-- Step 3: Run the validation function
SELECT validate_and_move_to_eventos_reales();

-- Step 4: Check the validation result
SELECT 
  id,
  allocation_plan_detail_id,
  estado,
  validaciones_fallidas,
  created_at
FROM public.allocation_plan_validacion_pendiente
ORDER BY created_at DESC
LIMIT 3;

-- Step 5: Verify the event was created and failed validation
SELECT 
  apd.id,
  apd.plan_id,
  apd.status,
  apd.nodo_origen,
  apd.nodo_destino,
  apd.numero_etiqueta,
  apd.fecha_envio_real,
  apd.fecha_recepcion_real,
  apd.producto_id,
  apd.carrier_id
FROM public.generated_allocation_plan_details apd
WHERE apd.status = 'VALIDATION_FAILED'
  AND apd.cliente_id = 13
ORDER BY apd.id DESC
LIMIT 1;
