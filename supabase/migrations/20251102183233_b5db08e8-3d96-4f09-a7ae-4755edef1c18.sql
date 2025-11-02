-- ============================================================
-- FASE 1: CRÍTICA - Restringir Tabla de Traducciones
-- ============================================================

-- Eliminar política permisiva actual
DROP POLICY IF EXISTS "Authenticated users can manage translations" ON public.traducciones;

-- Crear política restrictiva para escritura (solo admin y superadmin)
CREATE POLICY "Only admins can insert translations"
ON public.traducciones
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(get_current_user_id(), 'admin'::app_role) OR 
  has_role(get_current_user_id(), 'superadmin'::app_role)
);

CREATE POLICY "Only admins can update translations"
ON public.traducciones
FOR UPDATE
TO authenticated
USING (
  has_role(get_current_user_id(), 'admin'::app_role) OR 
  has_role(get_current_user_id(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(get_current_user_id(), 'admin'::app_role) OR 
  has_role(get_current_user_id(), 'superadmin'::app_role)
);

CREATE POLICY "Only admins can delete translations"
ON public.traducciones
FOR DELETE
TO authenticated
USING (
  has_role(get_current_user_id(), 'admin'::app_role) OR 
  has_role(get_current_user_id(), 'superadmin'::app_role)
);

-- ============================================================
-- FASE 2: URGENTE - Proteger Datos Sensibles de Carriers
-- ============================================================

-- Eliminar políticas amplias actuales
DROP POLICY IF EXISTS "Users can manage carriers in their cliente" ON public.carriers;
DROP POLICY IF EXISTS "Users can view carriers in their cliente" ON public.carriers;

-- Solo admin y superadmin pueden ver todos los datos
CREATE POLICY "Admins can view all carrier data"
ON public.carriers
FOR SELECT
TO authenticated
USING (
  cliente_id = get_user_cliente_id() AND
  (has_role(get_current_user_id(), 'admin'::app_role) OR 
   has_role(get_current_user_id(), 'superadmin'::app_role))
);

-- Solo admin y superadmin pueden modificar
CREATE POLICY "Admins can insert carriers"
ON public.carriers
FOR INSERT
TO authenticated
WITH CHECK (
  cliente_id = get_user_cliente_id() AND
  (has_role(get_current_user_id(), 'admin'::app_role) OR 
   has_role(get_current_user_id(), 'superadmin'::app_role))
);

CREATE POLICY "Admins can update carriers"
ON public.carriers
FOR UPDATE
TO authenticated
USING (
  cliente_id = get_user_cliente_id() AND
  (has_role(get_current_user_id(), 'admin'::app_role) OR 
   has_role(get_current_user_id(), 'superadmin'::app_role))
)
WITH CHECK (
  cliente_id = get_user_cliente_id() AND
  (has_role(get_current_user_id(), 'admin'::app_role) OR 
   has_role(get_current_user_id(), 'superadmin'::app_role))
);

CREATE POLICY "Admins can delete carriers"
ON public.carriers
FOR DELETE
TO authenticated
USING (
  cliente_id = get_user_cliente_id() AND
  (has_role(get_current_user_id(), 'admin'::app_role) OR 
   has_role(get_current_user_id(), 'superadmin'::app_role))
);

-- Crear vista con datos básicos para coordinadores/managers
CREATE OR REPLACE VIEW public.carriers_public_view AS
SELECT 
  id,
  cliente_id,
  carrier_code,
  legal_name,
  commercial_name,
  status,
  operator_type,
  created_at
FROM public.carriers;

-- Permitir a coordinadores/managers ver vista básica
CREATE POLICY "Coordinators can view basic carrier info"
ON public.carriers
FOR SELECT
TO authenticated
USING (
  cliente_id = get_user_cliente_id() AND
  (has_role(get_current_user_id(), 'coordinator'::app_role) OR 
   has_role(get_current_user_id(), 'manager'::app_role))
);

-- ============================================================
-- FASE 2: URGENTE - Proteger PII de Panelistas
-- ============================================================

-- Eliminar política amplia actual
DROP POLICY IF EXISTS "Users can manage panelistas in their cliente" ON public.panelistas;

-- Solo coordinadores, admin y superadmin pueden ver datos completos
CREATE POLICY "Coordinators and admins can view all panelist data"
ON public.panelistas
FOR SELECT
TO authenticated
USING (
  cliente_id = get_user_cliente_id() AND
  (has_role(get_current_user_id(), 'coordinator'::app_role) OR 
   has_role(get_current_user_id(), 'admin'::app_role) OR 
   has_role(get_current_user_id(), 'superadmin'::app_role))
);

-- Solo coordinadores, admin y superadmin pueden modificar
CREATE POLICY "Coordinators and admins can insert panelistas"
ON public.panelistas
FOR INSERT
TO authenticated
WITH CHECK (
  cliente_id = get_user_cliente_id() AND
  (has_role(get_current_user_id(), 'coordinator'::app_role) OR 
   has_role(get_current_user_id(), 'admin'::app_role) OR 
   has_role(get_current_user_id(), 'superadmin'::app_role))
);

CREATE POLICY "Coordinators and admins can update panelistas"
ON public.panelistas
FOR UPDATE
TO authenticated
USING (
  cliente_id = get_user_cliente_id() AND
  (has_role(get_current_user_id(), 'coordinator'::app_role) OR 
   has_role(get_current_user_id(), 'admin'::app_role) OR 
   has_role(get_current_user_id(), 'superadmin'::app_role))
)
WITH CHECK (
  cliente_id = get_user_cliente_id() AND
  (has_role(get_current_user_id(), 'coordinator'::app_role) OR 
   has_role(get_current_user_id(), 'admin'::app_role) OR 
   has_role(get_current_user_id(), 'superadmin'::app_role))
);

CREATE POLICY "Coordinators and admins can delete panelistas"
ON public.panelistas
FOR DELETE
TO authenticated
USING (
  cliente_id = get_user_cliente_id() AND
  (has_role(get_current_user_id(), 'coordinator'::app_role) OR 
   has_role(get_current_user_id(), 'admin'::app_role) OR 
   has_role(get_current_user_id(), 'superadmin'::app_role))
);

-- Crear vista con datos básicos para managers (sin PII sensible)
CREATE OR REPLACE VIEW public.panelistas_basic_view AS
SELECT 
  id,
  cliente_id,
  nombre_completo,
  nodo_asignado,
  ciudad_id,
  estado,
  fecha_alta,
  idioma,
  plataforma_preferida
FROM public.panelistas;

-- Permitir a managers ver solo datos básicos
CREATE POLICY "Managers can view basic panelist info"
ON public.panelistas
FOR SELECT
TO authenticated
USING (
  cliente_id = get_user_cliente_id() AND
  has_role(get_current_user_id(), 'manager'::app_role)
);

-- ============================================================
-- FASE 4: MEJORAS - Tabla de Auditoría
-- ============================================================

-- Crear tabla de auditoría para acciones administrativas
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id integer NOT NULL REFERENCES public.usuarios(id),
  action varchar NOT NULL,
  resource_type varchar NOT NULL,
  resource_id varchar,
  details jsonb,
  ip_address varchar,
  user_agent varchar,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_audit_log_user_id ON public.admin_audit_log(user_id);
CREATE INDEX idx_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX idx_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- RLS para tabla de auditoría
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Solo superadmins pueden ver logs de auditoría
CREATE POLICY "Superadmins can view all audit logs"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (has_role(get_current_user_id(), 'superadmin'::app_role));

-- Sistema puede insertar logs (security definer function necesaria)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (user_id = get_current_user_id());