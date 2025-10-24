-- Hacer carrier_code opcional y permitir valores NULL
ALTER TABLE public.carriers 
ALTER COLUMN carrier_code DROP NOT NULL;

-- Actualizar los registros existentes que tienen carrier_code vacío
UPDATE public.carriers 
SET carrier_code = NULL 
WHERE carrier_code = '';

-- Agregar comentario explicativo
COMMENT ON COLUMN public.carriers.carrier_code IS 'Optional carrier code - use ID as primary identifier';