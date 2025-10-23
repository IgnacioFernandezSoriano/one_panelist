-- Agregar campo region_id a la tabla nodos
ALTER TABLE nodos
ADD COLUMN region_id integer;

-- Eliminar campos innecesarios
ALTER TABLE nodos
DROP COLUMN IF EXISTS nombre,
DROP COLUMN IF EXISTS tipo;

-- Agregar foreign key constraint para region_id
ALTER TABLE nodos
ADD CONSTRAINT fk_nodos_region 
FOREIGN KEY (region_id) 
REFERENCES regiones(id);