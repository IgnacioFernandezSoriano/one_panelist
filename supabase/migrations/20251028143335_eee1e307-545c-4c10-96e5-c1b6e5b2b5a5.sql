-- ============================================
-- FASE 0: LIMPIAR DATOS (excepto clientes y usuarios)
-- ============================================

TRUNCATE TABLE
  envios,
  incidencias,
  historial_incidencias,
  producto_materiales,
  productos_cliente,
  configuracion_workflows,
  nodos,
  panelistas,
  regiones,
  ciudades,
  carriers
RESTART IDENTITY CASCADE;

-- ============================================
-- FASE 1: AÑADIR cliente_id A TABLAS
-- ============================================

-- usuarios (primero)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES public.clientes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_usuarios_cliente_id ON public.usuarios(cliente_id);

-- panelistas
ALTER TABLE public.panelistas 
ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES public.clientes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_panelistas_cliente_id ON public.panelistas(cliente_id);

-- nodos
ALTER TABLE public.nodos 
ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES public.clientes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_nodos_cliente_id ON public.nodos(cliente_id);

-- incidencias
ALTER TABLE public.incidencias 
ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES public.clientes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_incidencias_cliente_id ON public.incidencias(cliente_id);

-- historial_incidencias
ALTER TABLE public.historial_incidencias 
ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES public.clientes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_historial_incidencias_cliente_id ON public.historial_incidencias(cliente_id);

-- carriers (puede ser NULL para carriers globales)
ALTER TABLE public.carriers 
ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES public.clientes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_carriers_cliente_id ON public.carriers(cliente_id);

-- También añadir a otras tablas relacionadas
ALTER TABLE public.envios 
ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES public.clientes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_envios_cliente_id ON public.envios(cliente_id);

-- ============================================
-- FASE 2: CREAR ENUM Y TABLA DE ROLES
-- ============================================

-- Crear enum de roles (si ya existe, se eliminará primero)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    DROP TYPE public.app_role CASCADE;
  END IF;
END $$;

CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'coordinator', 'manager');

-- Crear tabla de roles de usuario
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Habilitar RLS en user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- ============================================
-- FASE 3: FUNCIONES DE SEGURIDAD
-- ============================================

-- Función para obtener el user_id desde la sesión de auth
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.usuarios WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid());
$$;

-- Función para verificar si un usuario tiene un rol específico
CREATE OR REPLACE FUNCTION public.has_role(_user_id INTEGER, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Función para obtener el cliente_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_cliente_id()
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cliente_id FROM public.usuarios WHERE id = public.get_current_user_id();
$$;

-- ============================================
-- FASE 4: APLICAR POLÍTICAS RLS
-- ============================================

-- Eliminar políticas existentes primero
DROP POLICY IF EXISTS "Allow authenticated full access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated full access to clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow authenticated full access to usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Allow authenticated full access to panelistas" ON public.panelistas;
DROP POLICY IF EXISTS "Allow authenticated full access to nodos" ON public.nodos;
DROP POLICY IF EXISTS "Allow authenticated full access to envios" ON public.envios;
DROP POLICY IF EXISTS "Allow authenticated full access to incidencias" ON public.incidencias;
DROP POLICY IF EXISTS "Allow authenticated full access to historial" ON public.historial_incidencias;
DROP POLICY IF EXISTS "Allow authenticated full access to ciudades" ON public.ciudades;
DROP POLICY IF EXISTS "Allow authenticated full access to regiones" ON public.regiones;
DROP POLICY IF EXISTS "Allow authenticated full access to productos_cliente" ON public.productos_cliente;
DROP POLICY IF EXISTS "Allow authenticated full access to config" ON public.configuracion_workflows;
DROP POLICY IF EXISTS "Allow authenticated full access to producto_materiales" ON public.producto_materiales;
DROP POLICY IF EXISTS "Allow authenticated full access to carriers" ON public.carriers;
DROP POLICY IF EXISTS "Allow authenticated full access to plantillas" ON public.plantillas_mensajes;
DROP POLICY IF EXISTS "Allow authenticated full access to tipos_material" ON public.tipos_material;

-- user_roles: solo superadmins pueden gestionar roles
CREATE POLICY "Superadmins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = public.get_current_user_id());

-- clientes: superadmins pueden ver todos, otros solo el suyo
CREATE POLICY "Superadmins can manage all clientes"
ON public.clientes
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Users can view their own cliente"
ON public.clientes
FOR SELECT
USING (id = public.get_user_cliente_id());

-- usuarios: filtrado por cliente_id
CREATE POLICY "Superadmins can manage all usuarios"
ON public.usuarios
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Admins can manage usuarios in their cliente"
ON public.usuarios
FOR ALL
USING (
  public.has_role(public.get_current_user_id(), 'admin') 
  AND cliente_id = public.get_user_cliente_id()
)
WITH CHECK (
  public.has_role(public.get_current_user_id(), 'admin') 
  AND cliente_id = public.get_user_cliente_id()
);

CREATE POLICY "Users can view their own profile"
ON public.usuarios
FOR SELECT
USING (id = public.get_current_user_id());

-- panelistas: filtrado por cliente_id
CREATE POLICY "Superadmins can manage all panelistas"
ON public.panelistas
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Users can manage panelistas in their cliente"
ON public.panelistas
FOR ALL
USING (cliente_id = public.get_user_cliente_id())
WITH CHECK (cliente_id = public.get_user_cliente_id());

-- nodos: filtrado por cliente_id
CREATE POLICY "Superadmins can manage all nodos"
ON public.nodos
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Users can manage nodos in their cliente"
ON public.nodos
FOR ALL
USING (cliente_id = public.get_user_cliente_id())
WITH CHECK (cliente_id = public.get_user_cliente_id());

-- envios: filtrado por cliente_id
CREATE POLICY "Superadmins can manage all envios"
ON public.envios
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Users can manage envios in their cliente"
ON public.envios
FOR ALL
USING (cliente_id = public.get_user_cliente_id())
WITH CHECK (cliente_id = public.get_user_cliente_id());

-- incidencias: filtrado por cliente_id
CREATE POLICY "Superadmins can manage all incidencias"
ON public.incidencias
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Users can manage incidencias in their cliente"
ON public.incidencias
FOR ALL
USING (cliente_id = public.get_user_cliente_id())
WITH CHECK (cliente_id = public.get_user_cliente_id());

-- historial_incidencias: filtrado por cliente_id
CREATE POLICY "Superadmins can manage all historial"
ON public.historial_incidencias
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Users can manage historial in their cliente"
ON public.historial_incidencias
FOR ALL
USING (cliente_id = public.get_user_cliente_id())
WITH CHECK (cliente_id = public.get_user_cliente_id());

-- ciudades: filtrado por cliente_id
CREATE POLICY "Superadmins can manage all ciudades"
ON public.ciudades
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Users can manage ciudades in their cliente"
ON public.ciudades
FOR ALL
USING (cliente_id = public.get_user_cliente_id())
WITH CHECK (cliente_id = public.get_user_cliente_id());

-- regiones: filtrado por cliente_id
CREATE POLICY "Superadmins can manage all regiones"
ON public.regiones
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Users can manage regiones in their cliente"
ON public.regiones
FOR ALL
USING (cliente_id = public.get_user_cliente_id())
WITH CHECK (cliente_id = public.get_user_cliente_id());

-- productos_cliente: filtrado por cliente_id
CREATE POLICY "Superadmins can manage all productos"
ON public.productos_cliente
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Users can manage productos in their cliente"
ON public.productos_cliente
FOR ALL
USING (cliente_id = public.get_user_cliente_id())
WITH CHECK (cliente_id = public.get_user_cliente_id());

-- configuracion_workflows: filtrado por cliente_id
CREATE POLICY "Superadmins can manage all workflows"
ON public.configuracion_workflows
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Users can manage workflows in their cliente"
ON public.configuracion_workflows
FOR ALL
USING (cliente_id = public.get_user_cliente_id())
WITH CHECK (cliente_id = public.get_user_cliente_id());

-- producto_materiales: acceso basado en el producto
CREATE POLICY "Superadmins can manage all producto_materiales"
ON public.producto_materiales
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Users can manage producto_materiales in their cliente"
ON public.producto_materiales
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.productos_cliente 
    WHERE id = producto_materiales.producto_id 
    AND cliente_id = public.get_user_cliente_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.productos_cliente 
    WHERE id = producto_materiales.producto_id 
    AND cliente_id = public.get_user_cliente_id()
  )
);

-- carriers: visibles globalmente (cliente_id NULL) o por cliente
CREATE POLICY "Superadmins can manage all carriers"
ON public.carriers
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

CREATE POLICY "Users can view global and their carriers"
ON public.carriers
FOR SELECT
USING (cliente_id IS NULL OR cliente_id = public.get_user_cliente_id());

CREATE POLICY "Users can manage carriers in their cliente"
ON public.carriers
FOR ALL
USING (cliente_id = public.get_user_cliente_id())
WITH CHECK (cliente_id = public.get_user_cliente_id());

-- plantillas_mensajes: acceso global (sin cliente_id)
CREATE POLICY "Authenticated users can view plantillas"
ON public.plantillas_mensajes
FOR SELECT
USING (true);

CREATE POLICY "Superadmins and admins can manage plantillas"
ON public.plantillas_mensajes
FOR ALL
USING (
  public.has_role(public.get_current_user_id(), 'superadmin') 
  OR public.has_role(public.get_current_user_id(), 'admin')
)
WITH CHECK (
  public.has_role(public.get_current_user_id(), 'superadmin') 
  OR public.has_role(public.get_current_user_id(), 'admin')
);

-- tipos_material: acceso global (sin cliente_id)
CREATE POLICY "Authenticated users can view tipos_material"
ON public.tipos_material
FOR SELECT
USING (true);

CREATE POLICY "Superadmins and admins can manage tipos_material"
ON public.tipos_material
FOR ALL
USING (
  public.has_role(public.get_current_user_id(), 'superadmin') 
  OR public.has_role(public.get_current_user_id(), 'admin')
)
WITH CHECK (
  public.has_role(public.get_current_user_id(), 'superadmin') 
  OR public.has_role(public.get_current_user_id(), 'admin')
);