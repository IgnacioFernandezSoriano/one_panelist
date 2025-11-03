-- Create function to update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create ciudad_transit_times table
CREATE TABLE IF NOT EXISTS public.ciudad_transit_times (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  ciudad_origen_id INTEGER NOT NULL REFERENCES public.ciudades(id) ON DELETE CASCADE,
  ciudad_destino_id INTEGER NOT NULL REFERENCES public.ciudades(id) ON DELETE CASCADE,
  dias_transito INTEGER NOT NULL DEFAULT 0 CHECK (dias_transito >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_ciudad_pair UNIQUE(cliente_id, ciudad_origen_id, ciudad_destino_id),
  CONSTRAINT different_cities CHECK (ciudad_origen_id != ciudad_destino_id)
);

-- Create indexes for better performance
CREATE INDEX idx_ciudad_transit_times_cliente ON public.ciudad_transit_times(cliente_id);
CREATE INDEX idx_ciudad_transit_times_origen ON public.ciudad_transit_times(ciudad_origen_id);
CREATE INDEX idx_ciudad_transit_times_destino ON public.ciudad_transit_times(ciudad_destino_id);
CREATE INDEX idx_ciudad_transit_times_composite ON public.ciudad_transit_times(cliente_id, ciudad_origen_id, ciudad_destino_id);

-- Enable Row Level Security
ALTER TABLE public.ciudad_transit_times ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Superadmins can manage all transit times"
  ON public.ciudad_transit_times
  FOR ALL
  USING (has_role(get_current_user_id(), 'superadmin'::app_role))
  WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Users can manage transit times in their cliente"
  ON public.ciudad_transit_times
  FOR ALL
  USING (cliente_id = get_user_cliente_id())
  WITH CHECK (cliente_id = get_user_cliente_id());

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_ciudad_transit_times_updated_at
  BEFORE UPDATE ON public.ciudad_transit_times
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();