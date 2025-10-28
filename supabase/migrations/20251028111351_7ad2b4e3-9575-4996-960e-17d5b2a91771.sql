-- Create tipos_material table (master catalog of material types)
CREATE TABLE public.tipos_material (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  unidad_medida VARCHAR(50) NOT NULL DEFAULT 'unidad',
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fecha_modificacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create producto_materiales table (many-to-many relationship)
CREATE TABLE public.producto_materiales (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES public.productos_cliente(id) ON DELETE CASCADE,
  tipo_material_id INTEGER NOT NULL REFERENCES public.tipos_material(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 1,
  es_obligatorio BOOLEAN NOT NULL DEFAULT TRUE,
  notas TEXT,
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fecha_modificacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(producto_id, tipo_material_id)
);

-- Enable RLS
ALTER TABLE public.tipos_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_materiales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated full access to tipos_material"
  ON public.tipos_material
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to producto_materiales"
  ON public.producto_materiales
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_tipos_material_modified_at
  BEFORE UPDATE ON public.tipos_material
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_producto_materiales_modified_at
  BEFORE UPDATE ON public.producto_materiales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();

-- Create indexes for better performance
CREATE INDEX idx_producto_materiales_producto ON public.producto_materiales(producto_id);
CREATE INDEX idx_producto_materiales_material ON public.producto_materiales(tipo_material_id);
CREATE INDEX idx_envios_producto ON public.envios(producto_id);