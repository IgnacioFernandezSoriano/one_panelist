-- Actualizar datos existentes de mayúsculas a minúsculas
UPDATE panelistas 
SET idioma = CASE 
  WHEN idioma = 'SP' THEN 'es'
  WHEN idioma = 'EN' THEN 'en'
  WHEN idioma = 'FR' THEN 'fr'
  WHEN idioma = 'AR' THEN 'ar'
  ELSE idioma
END
WHERE idioma IN ('SP', 'EN', 'FR', 'AR');

-- Eliminar la restricción actual
ALTER TABLE panelistas DROP CONSTRAINT IF EXISTS panelistas_idioma_check;

-- Crear nueva restricción con códigos ISO 639-1 estándar
ALTER TABLE panelistas 
ADD CONSTRAINT panelistas_idioma_check 
CHECK (idioma IN ('es', 'en', 'pt', 'fr', 'ar'));