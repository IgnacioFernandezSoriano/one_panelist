-- Primero, convertir la columna a TEXT temporalmente
ALTER TABLE carriers 
  ALTER COLUMN operator_type TYPE TEXT;

-- Actualizar los valores existentes
UPDATE carriers 
SET operator_type = CASE operator_type
  WHEN 'universal_postal' THEN 'designated_usp'
  WHEN 'private_postal' THEN 'licensed_postal'
  WHEN 'courier' THEN 'express_courier'
  WHEN 'logistics' THEN 'ecommerce_parcel'
  ELSE 'others'
END
WHERE operator_type IN ('universal_postal', 'private_postal', 'courier', 'logistics');

-- Eliminar el enum antiguo
DROP TYPE operator_type;

-- Crear el nuevo enum
CREATE TYPE operator_type AS ENUM (
  'designated_usp',
  'licensed_postal', 
  'express_courier',
  'ecommerce_parcel',
  'exempt',
  'others'
);

-- Convertir la columna de TEXT al nuevo enum
ALTER TABLE carriers 
  ALTER COLUMN operator_type TYPE operator_type 
  USING operator_type::operator_type;