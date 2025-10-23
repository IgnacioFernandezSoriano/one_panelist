-- =====================================================================
-- NUEVAS TABLAS: REGIONES Y CIUDADES
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla: regiones
-- Propósito: Divisiones geográficas administrativas por cliente
-- ---------------------------------------------------------------------
CREATE TABLE public.regiones (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  pais VARCHAR(100) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_modificacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_regiones_cliente FOREIGN KEY (cliente_id) 
    REFERENCES public.clientes(id) ON DELETE CASCADE,
  CONSTRAINT uq_regiones_cliente_codigo UNIQUE (cliente_id, codigo)
);

-- Índices para regiones
CREATE INDEX idx_regiones_cliente ON public.regiones(cliente_id);
CREATE INDEX idx_regiones_pais ON public.regiones(pais);
CREATE INDEX idx_regiones_estado ON public.regiones(estado);

-- Trigger para actualizar fecha_modificacion en regiones
CREATE TRIGGER update_regiones_modified 
  BEFORE UPDATE ON public.regiones
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_modified_column();

-- RLS para regiones
ALTER TABLE public.regiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to regiones"
  ON public.regiones
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------
-- Tabla: ciudades
-- Propósito: Catálogo de ciudades con clasificación y posicionamiento GPS
-- ---------------------------------------------------------------------
CREATE TABLE public.ciudades (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL,
  region_id INTEGER NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  codigo_postal_principal VARCHAR(20),
  pais VARCHAR(100) NOT NULL,
  clasificacion VARCHAR(1) NOT NULL CHECK (clasificacion IN ('A','B','C')),
  latitud DECIMAL(10,7) NOT NULL,
  longitud DECIMAL(10,7) NOT NULL,
  volumen_poblacional INTEGER,
  volumen_trafico_postal INTEGER,
  criterio_clasificacion VARCHAR(50),
  descripcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_modificacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_ciudades_cliente FOREIGN KEY (cliente_id) 
    REFERENCES public.clientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_ciudades_region FOREIGN KEY (region_id) 
    REFERENCES public.regiones(id) ON DELETE RESTRICT,
  CONSTRAINT uq_ciudades_cliente_codigo UNIQUE (cliente_id, codigo)
);

-- Comentarios para ciudades
COMMENT ON COLUMN public.ciudades.criterio_clasificacion IS 'poblacional, postal, mixto';

-- Índices para ciudades
CREATE INDEX idx_ciudades_cliente ON public.ciudades(cliente_id);
CREATE INDEX idx_ciudades_region ON public.ciudades(region_id);
CREATE INDEX idx_ciudades_clasificacion ON public.ciudades(clasificacion);
CREATE INDEX idx_ciudades_pais ON public.ciudades(pais);
CREATE INDEX idx_ciudades_estado ON public.ciudades(estado);
CREATE INDEX idx_ciudades_coordenadas ON public.ciudades(latitud, longitud);

-- Trigger para actualizar fecha_modificacion en ciudades
CREATE TRIGGER update_ciudades_modified 
  BEFORE UPDATE ON public.ciudades
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_modified_column();

-- RLS para ciudades
ALTER TABLE public.ciudades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to ciudades"
  ON public.ciudades
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------
-- Actualizar tabla nodos: agregar ciudad_id
-- ---------------------------------------------------------------------
ALTER TABLE public.nodos 
  ADD COLUMN ciudad_id INTEGER;

ALTER TABLE public.nodos
  ADD CONSTRAINT fk_nodos_ciudad FOREIGN KEY (ciudad_id) 
    REFERENCES public.ciudades(id) ON DELETE SET NULL;

CREATE INDEX idx_nodos_ciudad_id ON public.nodos(ciudad_id);

COMMENT ON COLUMN public.nodos.ciudad IS 'Campo descriptivo (mantener por compatibilidad)';

-- ---------------------------------------------------------------------
-- Actualizar tabla panelistas: agregar ciudad_id
-- ---------------------------------------------------------------------
ALTER TABLE public.panelistas 
  ADD COLUMN ciudad_id INTEGER;

ALTER TABLE public.panelistas
  ADD CONSTRAINT fk_panelistas_ciudad FOREIGN KEY (ciudad_id) 
    REFERENCES public.ciudades(id) ON DELETE SET NULL;

CREATE INDEX idx_panelistas_ciudad_id ON public.panelistas(ciudad_id);

COMMENT ON COLUMN public.panelistas.direccion_ciudad IS 'Campo descriptivo (mantener por compatibilidad)';