-- Primero eliminar duplicados existentes si los hay
DELETE FROM public.traducciones a
USING public.traducciones b
WHERE a.id > b.id 
  AND a.clave = b.clave 
  AND a.idioma = b.idioma;

-- Crear restricción única para la combinación de clave e idioma
ALTER TABLE public.traducciones
ADD CONSTRAINT traducciones_clave_idioma_unique UNIQUE (clave, idioma);