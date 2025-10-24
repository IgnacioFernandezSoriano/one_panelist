-- Create productos_cliente table
CREATE TABLE public.productos_cliente (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES public.clientes(id),
  codigo_producto VARCHAR(50) NOT NULL,
  nombre_producto VARCHAR(255) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_modificacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_cliente_producto UNIQUE (cliente_id, codigo_producto)
);

-- Create indexes
CREATE INDEX idx_productos_cliente_cliente_id ON public.productos_cliente(cliente_id);
CREATE INDEX idx_productos_cliente_estado ON public.productos_cliente(estado);

-- Enable RLS
ALTER TABLE public.productos_cliente ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow authenticated full access to productos_cliente" 
ON public.productos_cliente 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add trigger for automatic fecha_modificacion updates
CREATE TRIGGER update_productos_cliente_fecha_modificacion
BEFORE UPDATE ON public.productos_cliente
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();

-- Add producto_id to envios table
ALTER TABLE public.envios 
ADD COLUMN producto_id INTEGER REFERENCES public.productos_cliente(id);

-- Create index on producto_id
CREATE INDEX idx_envios_producto_id ON public.envios(producto_id);

-- Make tipo_producto nullable (keep for compatibility)
ALTER TABLE public.envios 
ALTER COLUMN tipo_producto DROP NOT NULL;

-- Add comments
COMMENT ON TABLE public.productos_cliente IS 'Catálogo de productos definidos por cliente';
COMMENT ON COLUMN public.envios.producto_id IS 'Referencia al producto del catálogo del cliente';