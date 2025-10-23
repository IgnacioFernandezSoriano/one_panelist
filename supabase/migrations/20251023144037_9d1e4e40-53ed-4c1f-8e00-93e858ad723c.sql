-- Modificar columnas latitud y longitud para permitir valores NULL
ALTER TABLE ciudades 
ALTER COLUMN latitud DROP NOT NULL;

ALTER TABLE ciudades 
ALTER COLUMN longitud DROP NOT NULL;