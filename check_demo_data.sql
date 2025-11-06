-- Check DEMO client data
SELECT 'generated_allocation_plans' as table_name, COUNT(*) as count FROM generated_allocation_plans WHERE cliente_id = 13
UNION ALL
SELECT 'panelistas', COUNT(*) FROM panelistas WHERE cliente_id = 13
UNION ALL
SELECT 'incidencias', COUNT(*) FROM incidencias WHERE cliente_id = 13
UNION ALL
SELECT 'envios', COUNT(*) FROM envios WHERE cliente_id = 13
UNION ALL
SELECT 'eventos_reales', COUNT(*) FROM eventos_reales WHERE cliente_id = 13
UNION ALL
SELECT 'carriers', COUNT(*) FROM carriers WHERE cliente_id = 13
UNION ALL
SELECT 'productos_cliente', COUNT(*) FROM productos_cliente WHERE cliente_id = 13
UNION ALL
SELECT 'nodos', COUNT(*) FROM nodos WHERE cliente_id = 13;
