-- Create enum types
CREATE TYPE app_role AS ENUM ('gestor', 'coordinador', 'administrador');
CREATE TYPE estado_general AS ENUM ('activo', 'inactivo', 'suspendido');
CREATE TYPE estado_envio AS ENUM ('PENDIENTE', 'NOTIFICADO', 'ENVIADO', 'RECIBIDO', 'CANCELADO');
CREATE TYPE tipo_incidencia AS ENUM ('cambio_direccion', 'no_disponible', 'muestra_dañada', 'extravio', 'problema_generico');
CREATE TYPE estado_incidencia AS ENUM ('abierta', 'en_proceso', 'resuelta', 'cerrada');
CREATE TYPE prioridad_incidencia AS ENUM ('baja', 'media', 'alta', 'critica');
CREATE TYPE origen_incidencia AS ENUM ('agente', 'gestor', 'sistema');

-- Create Clientes table
CREATE TABLE public.clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  pais VARCHAR(100) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  fecha_alta TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Nodos table
CREATE TABLE public.nodos (
  codigo VARCHAR(50) PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  pais VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('urbano', 'rural', 'centro_logistico')),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
);

-- Create Usuarios table (for managers/coordinators)
CREATE TABLE public.usuarios (
  id SERIAL PRIMARY KEY,
  nombre_completo VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol app_role NOT NULL,
  telefono VARCHAR(20),
  whatsapp_telegram_cuenta VARCHAR(50),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_ultimo_acceso TIMESTAMP
);

-- Create Panelistas table
CREATE TABLE public.panelistas (
  id SERIAL PRIMARY KEY,
  nombre_completo VARCHAR(200) NOT NULL,
  direccion_calle VARCHAR(300) NOT NULL,
  direccion_ciudad VARCHAR(100) NOT NULL,
  direccion_codigo_postal VARCHAR(20) NOT NULL,
  direccion_pais VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(200),
  idioma VARCHAR(2) NOT NULL CHECK (idioma IN ('EN', 'FR', 'AR', 'SP')),
  plataforma_preferida VARCHAR(20) NOT NULL CHECK (plataforma_preferida IN ('whatsapp', 'telegram')),
  zona_horaria VARCHAR(50) NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fin TIME NOT NULL,
  nodo_asignado VARCHAR(50) REFERENCES public.nodos(codigo),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  gestor_asignado_id INTEGER REFERENCES public.usuarios(id),
  fecha_alta TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_ultima_modificacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Panelistas
CREATE INDEX idx_panelistas_telefono ON public.panelistas(telefono);
CREATE INDEX idx_panelistas_nodo ON public.panelistas(nodo_asignado);
CREATE INDEX idx_panelistas_estado ON public.panelistas(estado);
CREATE INDEX idx_panelistas_gestor ON public.panelistas(gestor_asignado_id);

-- Create Envios table
CREATE TABLE public.envios (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  cliente_id INTEGER NOT NULL REFERENCES public.clientes(id),
  nodo_origen VARCHAR(50) NOT NULL REFERENCES public.nodos(codigo),
  nodo_destino VARCHAR(50) NOT NULL REFERENCES public.nodos(codigo),
  panelista_origen_id INTEGER NOT NULL REFERENCES public.panelistas(id),
  panelista_destino_id INTEGER NOT NULL REFERENCES public.panelistas(id),
  fecha_programada DATE NOT NULL,
  fecha_limite DATE NOT NULL,
  tipo_producto VARCHAR(50) NOT NULL,
  numero_etiqueta VARCHAR(50) UNIQUE,
  estado estado_envio NOT NULL DEFAULT 'PENDIENTE',
  fecha_notificacion TIMESTAMP,
  fecha_envio_real TIMESTAMP,
  fecha_recepcion_real TIMESTAMP,
  tiempo_transito_dias INTEGER,
  motivo_creacion VARCHAR(50) NOT NULL CHECK (motivo_creacion IN ('programado', 'compensatorio_extravio', 'compensatorio_no_disponible')),
  envio_original_id INTEGER REFERENCES public.envios(id),
  observaciones TEXT,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_ultima_modificacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Envios
CREATE INDEX idx_envios_codigo ON public.envios(codigo);
CREATE INDEX idx_envios_estado ON public.envios(estado);
CREATE INDEX idx_envios_fecha_programada ON public.envios(fecha_programada);
CREATE INDEX idx_envios_panelista_origen ON public.envios(panelista_origen_id);
CREATE INDEX idx_envios_panelista_destino ON public.envios(panelista_destino_id);
CREATE INDEX idx_envios_numero_etiqueta ON public.envios(numero_etiqueta);

-- Create Incidencias table
CREATE TABLE public.incidencias (
  id SERIAL PRIMARY KEY,
  tipo tipo_incidencia NOT NULL,
  panelista_id INTEGER NOT NULL REFERENCES public.panelistas(id),
  envio_id INTEGER REFERENCES public.envios(id),
  descripcion TEXT NOT NULL,
  datos_adicionales JSONB,
  origen origen_incidencia NOT NULL,
  prioridad prioridad_incidencia NOT NULL,
  estado estado_incidencia NOT NULL DEFAULT 'abierta',
  gestor_asignado_id INTEGER REFERENCES public.usuarios(id),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_ultima_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_resolucion TIMESTAMP
);

-- Create indexes for Incidencias
CREATE INDEX idx_incidencias_tipo ON public.incidencias(tipo);
CREATE INDEX idx_incidencias_estado ON public.incidencias(estado);
CREATE INDEX idx_incidencias_panelista ON public.incidencias(panelista_id);
CREATE INDEX idx_incidencias_envio ON public.incidencias(envio_id);
CREATE INDEX idx_incidencias_gestor ON public.incidencias(gestor_asignado_id);

-- Create Historial_Incidencias table
CREATE TABLE public.historial_incidencias (
  id SERIAL PRIMARY KEY,
  incidencia_id INTEGER NOT NULL REFERENCES public.incidencias(id),
  usuario_id INTEGER REFERENCES public.usuarios(id),
  accion VARCHAR(50) NOT NULL CHECK (accion IN ('creacion', 'cambio_estado', 'comentario', 'reasignacion')),
  estado_anterior VARCHAR(20),
  estado_nuevo VARCHAR(20),
  comentario TEXT,
  fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Configuracion_Workflows table
CREATE TABLE public.configuracion_workflows (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES public.clientes(id),
  servicio_postal VARCHAR(50),
  dias_recordatorio INTEGER NOT NULL,
  dias_escalamiento INTEGER NOT NULL,
  dias_verificacion_recepcion INTEGER NOT NULL,
  dias_segunda_verificacion INTEGER,
  dias_declarar_extravio INTEGER NOT NULL,
  tipo_dias VARCHAR(20) NOT NULL CHECK (tipo_dias IN ('naturales', 'laborables')),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_modificacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Configuracion_Workflows
CREATE INDEX idx_config_workflows_cliente ON public.configuracion_workflows(cliente_id);
CREATE INDEX idx_config_workflows_servicio ON public.configuracion_workflows(servicio_postal);

-- Create Plantillas_Mensajes table
CREATE TABLE public.plantillas_mensajes (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  idioma VARCHAR(2) NOT NULL CHECK (idioma IN ('EN', 'FR', 'AR', 'SP')),
  contenido TEXT NOT NULL,
  variables JSONB,
  estado VARCHAR(20) NOT NULL DEFAULT 'activa',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_modificacion TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(codigo, idioma)
);

-- Create indexes for Plantillas_Mensajes
CREATE INDEX idx_plantillas_codigo_idioma ON public.plantillas_mensajes(codigo, idioma);
CREATE INDEX idx_plantillas_tipo ON public.plantillas_mensajes(tipo);

-- Enable Row Level Security on all tables
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panelistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantillas_mensajes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing authenticated users full access for now - can be refined later)
CREATE POLICY "Allow authenticated full access to clientes" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to nodos" ON public.nodos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to usuarios" ON public.usuarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to panelistas" ON public.panelistas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to envios" ON public.envios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to incidencias" ON public.incidencias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to historial" ON public.historial_incidencias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to config" ON public.configuracion_workflows FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to plantillas" ON public.plantillas_mensajes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create function to update modified timestamp
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_ultima_modificacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_panelistas_modified
  BEFORE UPDATE ON public.panelistas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_envios_modified
  BEFORE UPDATE ON public.envios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_incidencias_modified
  BEFORE UPDATE ON public.incidencias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();