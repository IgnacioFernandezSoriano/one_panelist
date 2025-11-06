-- Check specific nodes
SELECT 
  n.codigo as nodo_codigo,
  n.ciudad,
  n.cliente_id as nodo_cliente_id,
  p.id as panelista_id,
  p.nombre_completo as panelista_nombre,
  p.nodo_asignado,
  p.cliente_id as panelista_cliente_id,
  p.estado as panelista_estado
FROM nodos n
LEFT JOIN panelistas p ON p.nodo_asignado = n.codigo
WHERE n.codigo IN ('0001-0001-0001-0001', '0001-0001-0001-0002', '0001-0001-0001-0003', '0001-0001-0002-0001', '0001-0001-0002-0002')
ORDER BY n.codigo;
