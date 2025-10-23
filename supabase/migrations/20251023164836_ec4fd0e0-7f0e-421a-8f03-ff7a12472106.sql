-- Hacer que panelista_origen_id y panelista_destino_id sean opcionales
ALTER TABLE public.envios ALTER COLUMN panelista_origen_id DROP NOT NULL;
ALTER TABLE public.envios ALTER COLUMN panelista_destino_id DROP NOT NULL;

-- Hacer que fecha_limite sea opcional (se calculará automáticamente)
ALTER TABLE public.envios ALTER COLUMN fecha_limite DROP NOT NULL;

-- Eliminar campos innecesarios
ALTER TABLE public.envios DROP COLUMN IF EXISTS codigo;
ALTER TABLE public.envios DROP COLUMN IF EXISTS envio_original_id;
ALTER TABLE public.envios DROP COLUMN IF EXISTS fecha_ultima_modificacion;