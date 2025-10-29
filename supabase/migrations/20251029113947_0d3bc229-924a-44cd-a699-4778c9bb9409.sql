-- Create city_allocation_requirements table
CREATE TABLE IF NOT EXISTS public.city_allocation_requirements (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  ciudad_id INTEGER NOT NULL REFERENCES public.ciudades(id) ON DELETE CASCADE,
  from_classification_a INTEGER NOT NULL DEFAULT 0,
  from_classification_b INTEGER NOT NULL DEFAULT 0,
  from_classification_c INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cliente_id, ciudad_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_city_allocation_requirements_cliente_ciudad 
  ON public.city_allocation_requirements(cliente_id, ciudad_id);

-- Enable RLS
ALTER TABLE public.city_allocation_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Superadmins can manage all
CREATE POLICY "Superadmins can manage all city allocations"
  ON public.city_allocation_requirements
  FOR ALL
  USING (has_role(get_current_user_id(), 'superadmin'::app_role))
  WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

-- RLS Policy: Users can manage their cliente's allocations
CREATE POLICY "Users can manage city allocations in their cliente"
  ON public.city_allocation_requirements
  FOR ALL
  USING (cliente_id = get_user_cliente_id())
  WITH CHECK (cliente_id = get_user_cliente_id());

-- Create trigger for updated_at
CREATE TRIGGER update_city_allocation_requirements_updated_at
  BEFORE UPDATE ON public.city_allocation_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();