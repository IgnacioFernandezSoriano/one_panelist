-- Add carrier_id, producto_id, and target_percentage columns to ciudad_transit_times
ALTER TABLE public.ciudad_transit_times
  ADD COLUMN IF NOT EXISTS carrier_id integer,
  ADD COLUMN IF NOT EXISTS producto_id integer,
  ADD COLUMN IF NOT EXISTS target_percentage numeric NOT NULL DEFAULT 90;

-- Backfill target_percentage where NULL
UPDATE public.ciudad_transit_times
SET target_percentage = 90
WHERE target_percentage IS NULL;

-- Add foreign key constraints
ALTER TABLE public.ciudad_transit_times
  ADD CONSTRAINT ciudad_transit_times_carrier_fk
  FOREIGN KEY (carrier_id) REFERENCES public.carriers(id) ON DELETE SET NULL;

ALTER TABLE public.ciudad_transit_times
  ADD CONSTRAINT ciudad_transit_times_producto_fk
  FOREIGN KEY (producto_id) REFERENCES public.productos_cliente(id) ON DELETE SET NULL;

-- Add index for route lookups
CREATE INDEX IF NOT EXISTS ctt_cliente_route_idx
ON public.ciudad_transit_times (cliente_id, ciudad_origen_id, ciudad_destino_id);

-- Add unique index to prevent duplicates (treating NULL as "All")
CREATE UNIQUE INDEX IF NOT EXISTS ctt_unique_route_idx
ON public.ciudad_transit_times (
  cliente_id, 
  ciudad_origen_id, 
  ciudad_destino_id,
  COALESCE(carrier_id, -1), 
  COALESCE(producto_id, -1)
);