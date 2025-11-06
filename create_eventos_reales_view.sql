-- =====================================================
-- Create view: eventos_reales_with_standards
-- =====================================================
-- This view joins eventos_reales with ciudad_transit_times
-- to include standard transit days and target percentage

CREATE OR REPLACE VIEW eventos_reales_with_standards AS
SELECT 
  er.*,
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
);

-- Add comment
COMMENT ON VIEW eventos_reales_with_standards IS 'Eventos reales with standard transit times and performance targets from ciudad_transit_times';

-- Grant permissions
GRANT SELECT ON eventos_reales_with_standards TO authenticated;

-- Enable RLS (views inherit RLS from base tables)
-- No need to create separate policies as eventos_reales already has RLS

SELECT 'View eventos_reales_with_standards created successfully!' as status;
