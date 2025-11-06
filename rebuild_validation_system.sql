-- =====================================================
-- Rebuild Validation System for Allocation Plans
-- =====================================================
-- This migration rebuilds the validation system to work with
-- generated_allocation_plan_details instead of the old envios table

-- =====================================================
-- Step 1: Drop old eventos_reales table
-- =====================================================
DROP TABLE IF EXISTS public.eventos_reales CASCADE;

-- =====================================================
-- Step 2: Create new eventos_reales table
-- =====================================================
CREATE TABLE public.eventos_reales (
  id SERIAL PRIMARY KEY,
  
  -- Reference to the allocation plan detail (source event)
  allocation_plan_detail_id INTEGER NOT NULL REFERENCES public.generated_allocation_plan_details(id) ON DELETE CASCADE,
  
  -- Cliente reference
  cliente_id INTEGER NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  
  -- Carrier and Product
  carrier_id INTEGER REFERENCES public.carriers(id) ON DELETE SET NULL,
  producto_id INTEGER REFERENCES public.productos_cliente(id) ON DELETE SET NULL,
  
  -- Nodes (stored as strings, matching allocation plan)
  nodo_origen VARCHAR NOT NULL,
  nodo_destino VARCHAR NOT NULL,
  
  -- Panelistas
  panelista_origen_id INTEGER REFERENCES public.panelistas(id) ON DELETE SET NULL,
  panelista_destino_id INTEGER REFERENCES public.panelistas(id) ON DELETE SET NULL,
  
  -- Dates
  fecha_programada DATE NOT NULL,
  fecha_envio_real TIMESTAMPTZ,
  fecha_recepcion_real TIMESTAMPTZ,
  
  -- Performance metrics
  tiempo_transito_dias INTEGER,
  tiempo_transito_horas NUMERIC(10,2),
  
  -- Tracking
  numero_etiqueta VARCHAR,
  
  -- Validation info
  fecha_validacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validado_por INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for eventos_reales
CREATE INDEX idx_eventos_reales_cliente ON public.eventos_reales(cliente_id);
CREATE INDEX idx_eventos_reales_allocation_detail ON public.eventos_reales(allocation_plan_detail_id);
CREATE INDEX idx_eventos_reales_carrier ON public.eventos_reales(carrier_id);
CREATE INDEX idx_eventos_reales_producto ON public.eventos_reales(producto_id);
CREATE INDEX idx_eventos_reales_fecha_validacion ON public.eventos_reales(fecha_validacion);
CREATE INDEX idx_eventos_reales_nodo_origen ON public.eventos_reales(nodo_origen);
CREATE INDEX idx_eventos_reales_nodo_destino ON public.eventos_reales(nodo_destino);

-- Enable RLS on eventos_reales
ALTER TABLE public.eventos_reales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for eventos_reales
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
-- Step 3: Create allocation_plan_validacion_pendiente table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.allocation_plan_validacion_pendiente (
  id SERIAL PRIMARY KEY,
  
  -- Reference to the allocation plan detail
  allocation_plan_detail_id INTEGER NOT NULL REFERENCES public.generated_allocation_plan_details(id) ON DELETE CASCADE,
  
  -- Cliente reference
  cliente_id INTEGER NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  
  -- Validation errors (JSON array)
  validaciones_fallidas JSONB NOT NULL,
  
  -- Estado: pending_review, approved, cancelled
  estado VARCHAR(50) NOT NULL DEFAULT 'pending_review' CHECK (estado IN ('pending_review', 'approved', 'cancelled')),
  
  -- Resolution
  resuelto_por INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha_resolucion TIMESTAMPTZ,
  notas_resolucion TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for allocation_plan_validacion_pendiente
CREATE INDEX idx_allocation_validacion_cliente ON public.allocation_plan_validacion_pendiente(cliente_id);
CREATE INDEX idx_allocation_validacion_detail ON public.allocation_plan_validacion_pendiente(allocation_plan_detail_id);
CREATE INDEX idx_allocation_validacion_estado ON public.allocation_plan_validacion_pendiente(estado);
CREATE INDEX idx_allocation_validacion_created ON public.allocation_plan_validacion_pendiente(created_at);

-- Enable RLS on allocation_plan_validacion_pendiente
ALTER TABLE public.allocation_plan_validacion_pendiente ENABLE ROW LEVEL SECURITY;

-- RLS Policies for allocation_plan_validacion_pendiente
CREATE POLICY "Superadmins can manage all allocation validations"
  ON public.allocation_plan_validacion_pendiente FOR ALL
  TO authenticated
  USING (has_role(get_current_user_id(), 'superadmin'::app_role))
  WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Users can view allocation validations in their cliente"
  ON public.allocation_plan_validacion_pendiente FOR SELECT
  TO authenticated
  USING (cliente_id = get_user_cliente_id());

CREATE POLICY "Users can insert allocation validations in their cliente"
  ON public.allocation_plan_validacion_pendiente FOR INSERT
  TO authenticated
  WITH CHECK (cliente_id = get_user_cliente_id());

CREATE POLICY "Users can update allocation validations in their cliente"
  ON public.allocation_plan_validacion_pendiente FOR UPDATE
  TO authenticated
  USING (cliente_id = get_user_cliente_id())
  WITH CHECK (cliente_id = get_user_cliente_id());

-- =====================================================
-- Step 4: Create trigger for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_eventos_reales_updated_at BEFORE UPDATE ON public.eventos_reales
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_allocation_validacion_updated_at BEFORE UPDATE ON public.allocation_plan_validacion_pendiente
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Step 5: Create function to validate and move events
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
  
  -- All validations passed, move to eventos_reales
  INSERT INTO eventos_reales (
    allocation_plan_detail_id,
    cliente_id,
    carrier_id,
    producto_id,
    nodo_origen,
    nodo_destino,
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
    v_detail.nodo_origen,
    v_detail.nodo_destino,
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
-- Comments
-- =====================================================
COMMENT ON TABLE public.eventos_reales IS 'Validated events that have completed the full cycle and passed all validations';
COMMENT ON TABLE public.allocation_plan_validacion_pendiente IS 'Events that failed validation and are pending review';
COMMENT ON FUNCTION validate_and_move_to_eventos_reales IS 'Validates an event and moves it to eventos_reales or to pending validation';
