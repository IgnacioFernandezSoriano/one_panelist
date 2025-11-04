-- Eliminar registros con carrier_id o producto_id nulos
DELETE FROM ciudad_transit_times 
WHERE carrier_id IS NULL OR producto_id IS NULL;

-- Hacer carrier_id y producto_id obligatorios para prevenir registros inválidos en el futuro
ALTER TABLE ciudad_transit_times 
ALTER COLUMN carrier_id SET NOT NULL,
ALTER COLUMN producto_id SET NOT NULL;