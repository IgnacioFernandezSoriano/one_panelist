-- Remove conflicting unique constraint/index to allow multiple entries per route differentiated by carrier/product

-- 1) Drop old unique constraint if it exists
ALTER TABLE public.ciudad_transit_times
  DROP CONSTRAINT IF EXISTS unique_ciudad_pair;

-- 2) Drop old unique index if it exists
DROP INDEX IF EXISTS public.unique_ciudad_pair;

-- 3) Ensure the intended unique index exists (treat NULL as "All")
CREATE UNIQUE INDEX IF NOT EXISTS ctt_unique_route_idx
ON public.ciudad_transit_times (
  cliente_id,
  ciudad_origen_id,
  ciudad_destino_id,
  COALESCE(carrier_id, -1),
  COALESCE(producto_id, -1)
);
