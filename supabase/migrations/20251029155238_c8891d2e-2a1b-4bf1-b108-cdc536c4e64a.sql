-- Add max_events_per_panelist_week column to clientes table
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS max_events_per_panelist_week integer DEFAULT NULL;

-- Create carrier_productos table (relationship between products and carriers)
CREATE TABLE IF NOT EXISTS public.carrier_productos (
  id SERIAL PRIMARY KEY,
  producto_id integer NOT NULL REFERENCES public.productos_cliente(id) ON DELETE CASCADE,
  carrier_id integer NOT NULL REFERENCES public.carriers(id) ON DELETE CASCADE,
  cliente_id integer NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(producto_id, carrier_id)
);

-- Enable RLS on carrier_productos
ALTER TABLE public.carrier_productos ENABLE ROW LEVEL SECURITY;

-- RLS policies for carrier_productos
CREATE POLICY "Superadmins can manage all carrier_productos"
ON public.carrier_productos
FOR ALL
TO authenticated
USING (has_role(get_current_user_id(), 'superadmin'::app_role))
WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Users can manage carrier_productos in their cliente"
ON public.carrier_productos
FOR ALL
TO authenticated
USING (cliente_id = get_user_cliente_id())
WITH CHECK (cliente_id = get_user_cliente_id());

-- Create generated_allocation_plans table
CREATE TABLE IF NOT EXISTS public.generated_allocation_plans (
  id SERIAL PRIMARY KEY,
  cliente_id integer NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  carrier_id integer NOT NULL REFERENCES public.carriers(id) ON DELETE CASCADE,
  producto_id integer NOT NULL REFERENCES public.productos_cliente(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_events integer NOT NULL,
  calculated_events integer NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'merged')),
  merge_strategy varchar(20) NOT NULL DEFAULT 'add' CHECK (merge_strategy IN ('add', 'replace')),
  created_by integer REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  merged_at timestamp with time zone
);

-- Enable RLS on generated_allocation_plans
ALTER TABLE public.generated_allocation_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for generated_allocation_plans
CREATE POLICY "Superadmins can manage all allocation plans"
ON public.generated_allocation_plans
FOR ALL
TO authenticated
USING (has_role(get_current_user_id(), 'superadmin'::app_role))
WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Users can manage allocation plans in their cliente"
ON public.generated_allocation_plans
FOR ALL
TO authenticated
USING (cliente_id = get_user_cliente_id())
WITH CHECK (cliente_id = get_user_cliente_id());

-- Create generated_allocation_plan_details table
CREATE TABLE IF NOT EXISTS public.generated_allocation_plan_details (
  id SERIAL PRIMARY KEY,
  plan_id integer NOT NULL REFERENCES public.generated_allocation_plans(id) ON DELETE CASCADE,
  nodo_origen varchar NOT NULL,
  nodo_destino varchar NOT NULL,
  fecha_programada date NOT NULL,
  producto_id integer NOT NULL REFERENCES public.productos_cliente(id) ON DELETE CASCADE,
  carrier_id integer NOT NULL REFERENCES public.carriers(id) ON DELETE CASCADE,
  cliente_id integer NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on generated_allocation_plan_details
ALTER TABLE public.generated_allocation_plan_details ENABLE ROW LEVEL SECURITY;

-- RLS policies for generated_allocation_plan_details
CREATE POLICY "Superadmins can manage all plan details"
ON public.generated_allocation_plan_details
FOR ALL
TO authenticated
USING (has_role(get_current_user_id(), 'superadmin'::app_role))
WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Users can manage plan details in their cliente"
ON public.generated_allocation_plan_details
FOR ALL
TO authenticated
USING (cliente_id = get_user_cliente_id())
WITH CHECK (cliente_id = get_user_cliente_id());