-- Create product_seasonality table
CREATE TABLE IF NOT EXISTS public.product_seasonality (
  id SERIAL PRIMARY KEY,
  cliente_id integer NOT NULL,
  producto_id integer NOT NULL,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::integer,
  january_percentage numeric(5,2) NOT NULL DEFAULT 8.33,
  february_percentage numeric(5,2) NOT NULL DEFAULT 8.33,
  march_percentage numeric(5,2) NOT NULL DEFAULT 8.33,
  april_percentage numeric(5,2) NOT NULL DEFAULT 8.33,
  may_percentage numeric(5,2) NOT NULL DEFAULT 8.33,
  june_percentage numeric(5,2) NOT NULL DEFAULT 8.33,
  july_percentage numeric(5,2) NOT NULL DEFAULT 8.33,
  august_percentage numeric(5,2) NOT NULL DEFAULT 8.33,
  september_percentage numeric(5,2) NOT NULL DEFAULT 8.34,
  october_percentage numeric(5,2) NOT NULL DEFAULT 8.34,
  november_percentage numeric(5,2) NOT NULL DEFAULT 8.34,
  december_percentage numeric(5,2) NOT NULL DEFAULT 8.34,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_seasonality_cliente_producto_year_key UNIQUE (cliente_id, producto_id, year)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_product_seasonality_cliente_producto_year 
ON public.product_seasonality(cliente_id, producto_id, year);

-- Enable RLS
ALTER TABLE public.product_seasonality ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Superadmins can manage all product seasonality"
ON public.product_seasonality
FOR ALL
TO authenticated
USING (has_role(get_current_user_id(), 'superadmin'::app_role))
WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Users can manage product seasonality in their cliente"
ON public.product_seasonality
FOR ALL
TO authenticated
USING (cliente_id = get_user_cliente_id())
WITH CHECK (cliente_id = get_user_cliente_id());

-- Trigger for updated_at
CREATE TRIGGER update_product_seasonality_updated_at
BEFORE UPDATE ON public.product_seasonality
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();