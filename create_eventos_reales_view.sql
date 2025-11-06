-- =====================================================
-- Create RPC function: get_eventos_reales_with_standards
-- =====================================================
-- This function returns eventos_reales with join to ciudad_transit_times
-- to include standard transit days and target percentage
-- Using a function instead of a view to avoid RLS issues

-- Drop view if exists (migration from view to function)
DROP VIEW IF EXISTS eventos_reales_with_standards;

-- Create function
CREATE OR REPLACE FUNCTION get_eventos_reales_with_standards(p_cliente_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  allocation_plan_detail_id INTEGER,
  cliente_id INTEGER,
  carrier_id INTEGER,
  producto_id INTEGER,
  nodo_origen VARCHAR,
  nodo_destino VARCHAR,
  ciudad_origen VARCHAR,
  ciudad_destino VARCHAR,
  panelista_origen_id INTEGER,
  panelista_destino_id INTEGER,
  fecha_programada DATE,
  fecha_envio_real TIMESTAMPTZ,
  fecha_recepcion_real TIMESTAMPTZ,
  tiempo_transito_dias INTEGER,
  tiempo_transito_horas NUMERIC,
  numero_etiqueta VARCHAR,
  fecha_validacion TIMESTAMPTZ,
  validado_por INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  standard_transit_days INTEGER,
  target_performance_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    er.id,
    er.allocation_plan_detail_id,
    er.cliente_id,
    er.carrier_id,
    er.producto_id,
    er.nodo_origen,
    er.nodo_destino,
    er.ciudad_origen,
    er.ciudad_destino,
    er.panelista_origen_id,
    er.panelista_destino_id,
    er.fecha_programada,
    er.fecha_envio_real,
    er.fecha_recepcion_real,
    er.tiempo_transito_dias,
    er.tiempo_transito_horas,
    er.numero_etiqueta,
    er.fecha_validacion,
    er.validado_por,
    er.created_at,
    er.updated_at,
    ctt.dias_transito as standard_transit_days,
    ctt.target_percentage as target_performance_percentage
  FROM eventos_reales er
  LEFT JOIN nodos no ON er.nodo_origen = no.codigo
  LEFT JOIN nodos nd ON er.nodo_destino = nd.codigo
  LEFT JOIN ciudad_transit_times ctt ON (
    ctt.cliente_id = er.cliente_id
    AND ctt.ciudad_origen_id = no.ciudad_id
    AND ctt.ciudad_destino_id = nd.ciudad_id
    AND ctt.carrier_id = er.carrier_id
    AND ctt.producto_id = er.producto_id
  )
  WHERE er.cliente_id = p_cliente_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_eventos_reales_with_standards(INTEGER) IS 'Get eventos reales with standard transit times and performance targets from ciudad_transit_times for a specific cliente';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_eventos_reales_with_standards(INTEGER) TO authenticated;

SELECT 'Function get_eventos_reales_with_standards created successfully!' as status;
