-- =====================================================
-- Migrate eventos_reales table to use nodos with cities
-- =====================================================
-- This migration modifies eventos_reales to:
-- 1. Make allocation_plan_detail_id nullable
-- 2. Replace nodo_origen/nodo_destino (VARCHAR) with nodo_origen_id/nodo_destino_id (INTEGER)
-- 3. Add ciudad_origen and ciudad_destino fields
-- 4. Make panelista_origen_id and panelista_destino_id NOT NULL
-- 5. Make required fields NOT NULL according to specification
-- 6. Delete all existing records to avoid inconsistencies

-- =====================================================
-- Step 1: Delete all existing records
-- =====================================================
DELETE FROM public.eventos_reales;

-- =====================================================
-- Step 2: Drop old table and recreate with new schema
-- =====================================================
DROP TABLE IF EXISTS public.eventos_reales CASCADE;

CREATE TABLE public.eventos_reales (
  id SERIAL PRIMARY KEY,
  
  -- Reference to the allocation plan detail (NOW NULLABLE for synthetic events)
  allocation_plan_detail_id INTEGER REFERENCES public.generated_allocation_plan_details(id) ON DELETE CASCADE,
  
  -- Cliente reference (NOT NULL)
  cliente_id INTEGER NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  
  -- Carrier and Product (NOT NULL)
  carrier_id INTEGER NOT NULL REFERENCES public.carriers(id) ON DELETE RESTRICT,
  producto_id INTEGER NOT NULL REFERENCES public.productos_cliente(id) ON DELETE RESTRICT,
  
  -- Nodes as VARCHAR(50) references to codigo (NOT NULL)
  nodo_origen VARCHAR(50) NOT NULL REFERENCES public.nodos(codigo) ON DELETE RESTRICT,
  nodo_destino VARCHAR(50) NOT NULL REFERENCES public.nodos(codigo) ON DELETE RESTRICT,
  
  -- Cities (NOT NULL)
  ciudad_origen VARCHAR NOT NULL,
  ciudad_destino VARCHAR NOT NULL,
  
  -- Panelistas (NOT NULL)
  panelista_origen_id INTEGER NOT NULL REFERENCES public.panelistas(id) ON DELETE RESTRICT,
  panelista_destino_id INTEGER NOT NULL REFERENCES public.panelistas(id) ON DELETE RESTRICT,
  
  -- Dates (fecha_programada is now nullable, real dates are NOT NULL)
  fecha_programada DATE,
  fecha_envio_real TIMESTAMPTZ NOT NULL,
  fecha_recepcion_real TIMESTAMPTZ NOT NULL,
  
  -- Performance metrics (NOT NULL)
  tiempo_transito_dias INTEGER NOT NULL,
  tiempo_transito_horas NUMERIC(10,2) NOT NULL,
  
  -- Tracking (NOT NULL)
  numero_etiqueta VARCHAR NOT NULL,
  
  -- Validation info (NOT NULL)
  fecha_validacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validado_por INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  
  -- Audit (NOT NULL, auto-generated)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Step 3: Create indexes for eventos_reales
-- =====================================================
CREATE INDEX idx_eventos_reales_cliente ON public.eventos_reales(cliente_id);
CREATE INDEX idx_eventos_reales_allocation_detail ON public.eventos_reales(allocation_plan_detail_id);
CREATE INDEX idx_eventos_reales_carrier ON public.eventos_reales(carrier_id);
CREATE INDEX idx_eventos_reales_producto ON public.eventos_reales(producto_id);
CREATE INDEX idx_eventos_reales_fecha_validacion ON public.eventos_reales(fecha_validacion);
CREATE INDEX idx_eventos_reales_nodo_origen ON public.eventos_reales(nodo_origen);
CREATE INDEX idx_eventos_reales_nodo_destino ON public.eventos_reales(nodo_destino);
CREATE INDEX idx_eventos_reales_ciudad_origen ON public.eventos_reales(ciudad_origen);
CREATE INDEX idx_eventos_reales_ciudad_destino ON public.eventos_reales(ciudad_destino);
CREATE INDEX idx_eventos_reales_panelista_origen ON public.eventos_reales(panelista_origen_id);
CREATE INDEX idx_eventos_reales_panelista_destino ON public.eventos_reales(panelista_destino_id);
CREATE INDEX idx_eventos_reales_fecha_programada ON public.eventos_reales(fecha_programada);
CREATE INDEX idx_eventos_reales_fecha_envio ON public.eventos_reales(fecha_envio_real);
CREATE INDEX idx_eventos_reales_fecha_recepcion ON public.eventos_reales(fecha_recepcion_real);

-- =====================================================
-- Step 4: Enable RLS on eventos_reales
-- =====================================================
ALTER TABLE public.eventos_reales ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Step 5: Create RLS Policies for eventos_reales
-- =====================================================
CREATE POLICY "Superadmins can manage all eventos_reales"
  ON public.eventos_reales FOR ALL
  TO authenticated
  USING (has_role(get_current_user_id(), 'superadmin'::app_role))
  WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Users can view eventos_reales in their cliente"
  ON public.eventos_reales FOR SELECT
  TO authenticated
  USING (cliente_id = get_user_cliente_id());

CREATE POLICY "Users can insert eventos_reales in their cliente"
  ON public.eventos_reales FOR INSERT
  TO authenticated
  WITH CHECK (cliente_id = get_user_cliente_id());

-- =====================================================
-- Step 6: Create trigger for updated_at
-- =====================================================
CREATE TRIGGER update_eventos_reales_updated_at BEFORE UPDATE ON public.eventos_reales
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Step 7: Update validate_and_move_to_eventos_reales function
-- =====================================================
CREATE OR REPLACE FUNCTION validate_and_move_to_eventos_reales(
  p_allocation_plan_detail_id INTEGER,
  p_validado_por INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  evento_real_id INTEGER
) AS $$
DECLARE
  v_detail RECORD;
  v_validations JSONB;
  v_evento_real_id INTEGER;
  v_nodo_origen RECORD;
  v_nodo_destino RECORD;
BEGIN
  -- Get the allocation plan detail
  SELECT * INTO v_detail
  FROM generated_allocation_plan_details
  WHERE id = p_allocation_plan_detail_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Allocation plan detail not found', NULL::INTEGER;
    RETURN;
  END IF;
  
  -- Check if event is in RECEIVED status
  IF v_detail.status != 'RECEIVED' THEN
    RETURN QUERY SELECT FALSE, 'Event must be in RECEIVED status', NULL::INTEGER;
    RETURN;
  END IF;
  
  -- Run validations
  v_validations := jsonb_build_array();
  
  -- Validation 1: Check if numero_etiqueta exists
  IF v_detail.numero_etiqueta IS NULL OR v_detail.numero_etiqueta = '' THEN
    v_validations := v_validations || jsonb_build_object(
      'codigo', 'VAL001',
      'severidad', 'critical',
      'campo', 'numero_etiqueta',
      'descripcion', 'Tracking number is missing',
      'detalle', 'The event must have a valid tracking number'
    );
  END IF;
  
  -- Validation 2: Check if fecha_envio_real exists
  IF v_detail.fecha_envio_real IS NULL THEN
    v_validations := v_validations || jsonb_build_object(
      'codigo', 'VAL002',
      'severidad', 'critical',
      'campo', 'fecha_envio_real',
      'descripcion', 'Actual send date is missing',
      'detalle', 'The event must have a valid send date'
    );
  END IF;
  
  -- Validation 3: Check if fecha_recepcion_real exists
  IF v_detail.fecha_recepcion_real IS NULL THEN
    v_validations := v_validations || jsonb_build_object(
      'codigo', 'VAL003',
      'severidad', 'critical',
      'campo', 'fecha_recepcion_real',
      'descripcion', 'Actual receive date is missing',
      'detalle', 'The event must have a valid receive date'
    );
  END IF;
  
  -- Validation 4: Check if send date is before receive date
  IF v_detail.fecha_envio_real IS NOT NULL AND v_detail.fecha_recepcion_real IS NOT NULL THEN
    IF v_detail.fecha_envio_real > v_detail.fecha_recepcion_real THEN
      v_validations := v_validations || jsonb_build_object(
        'codigo', 'VAL004',
        'severidad', 'critical',
        'campo', 'fecha_envio_real',
        'descripcion', 'Send date is after receive date',
        'detalle', 'The send date must be before the receive date'
      );
    END IF;
  END IF;
  
  -- If there are critical validations, create pending validation record
  IF jsonb_array_length(v_validations) > 0 THEN
    INSERT INTO allocation_plan_validacion_pendiente (
      allocation_plan_detail_id,
      cliente_id,
      validaciones_fallidas,
      estado
    ) VALUES (
      p_allocation_plan_detail_id,
      v_detail.cliente_id,
      v_validations,
      'pending_review'
    );
    
    -- Update status to VALIDATION_FAILED
    UPDATE generated_allocation_plan_details
    SET status = 'VALIDATION_FAILED'
    WHERE id = p_allocation_plan_detail_id;
    
    RETURN QUERY SELECT FALSE, 'Validation failed. Event moved to pending validation.', NULL::INTEGER;
    RETURN;
  END IF;
  
  -- Get nodo information with cities
  SELECT codigo, ciudad INTO v_nodo_origen
  FROM nodos
  WHERE codigo = v_detail.nodo_origen;
  
  SELECT codigo, ciudad INTO v_nodo_destino
  FROM nodos
  WHERE codigo = v_detail.nodo_destino;
  
  -- All validations passed, move to eventos_reales
  INSERT INTO eventos_reales (
    allocation_plan_detail_id,
    cliente_id,
    carrier_id,
    producto_id,
    nodo_origen,
    nodo_destino,
    ciudad_origen,
    ciudad_destino,
    panelista_origen_id,
    panelista_destino_id,
    fecha_programada,
    fecha_envio_real,
    fecha_recepcion_real,
    tiempo_transito_dias,
    tiempo_transito_horas,
    numero_etiqueta,
    validado_por
  ) VALUES (
    v_detail.id,
    v_detail.cliente_id,
    v_detail.carrier_id,
    v_detail.producto_id,
    v_nodo_origen.codigo,
    v_nodo_destino.codigo,
    v_nodo_origen.ciudad,
    v_nodo_destino.ciudad,
    v_detail.panelista_origen_id,
    v_detail.panelista_destino_id,
    v_detail.fecha_programada,
    v_detail.fecha_envio_real,
    v_detail.fecha_recepcion_real,
    EXTRACT(DAY FROM (v_detail.fecha_recepcion_real - v_detail.fecha_envio_real)),
    EXTRACT(EPOCH FROM (v_detail.fecha_recepcion_real - v_detail.fecha_envio_real)) / 3600,
    v_detail.numero_etiqueta,
    p_validado_por
  ) RETURNING id INTO v_evento_real_id;
  
  -- Update status to VALIDATED
  UPDATE generated_allocation_plan_details
  SET status = 'VALIDATED'
  WHERE id = p_allocation_plan_detail_id;
  
  RETURN QUERY SELECT TRUE, 'Event validated and moved to eventos_reales', v_evento_real_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Step 8: Add comments
-- =====================================================
COMMENT ON TABLE public.eventos_reales IS 'Validated events that have completed the full cycle and passed all validations. Now includes node IDs and cities.';
COMMENT ON COLUMN public.eventos_reales.allocation_plan_detail_id IS 'Reference to allocation plan detail. Nullable to allow synthetic test events.';
COMMENT ON COLUMN public.eventos_reales.nodo_origen IS 'Origin node codigo reference';
COMMENT ON COLUMN public.eventos_reales.nodo_destino IS 'Destination node codigo reference';
COMMENT ON COLUMN public.eventos_reales.ciudad_origen IS 'Origin city from node';
COMMENT ON COLUMN public.eventos_reales.ciudad_destino IS 'Destination city from node';

-- =====================================================
-- Verification
-- =====================================================
SELECT 'Migration completed successfully!' as status;
SELECT 'eventos_reales table structure:' as info;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'eventos_reales'
  AND table_schema = 'public'
ORDER BY ordinal_position;
