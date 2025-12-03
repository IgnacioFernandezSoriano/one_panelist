-- ========================================
-- MIGRACIÓN: Agregar cliente_id a Generated Allocation Plans
-- ========================================
-- Fecha: 2024-12-03
-- Objetivo: Agregar cliente_id y RLS a las tablas de planes generados
-- Versión: FINAL (usando funciones helper existentes)
-- ========================================

-- ========================================
-- FASE 1: AGREGAR COLUMNAS cliente_id
-- ========================================

-- 1.1 generated_allocation_plans (tabla principal)
ALTER TABLE generated_allocation_plans ADD COLUMN IF NOT EXISTS cliente_id INTEGER;

-- 1.2 generated_allocation_plan_details (detalles del plan)
ALTER TABLE generated_allocation_plan_details ADD COLUMN IF NOT EXISTS cliente_id INTEGER;

-- ========================================
-- FASE 2: POBLAR DATOS EXISTENTES
-- ========================================

-- 2.1 generated_allocation_plans
-- Inferir cliente_id desde el carrier_id (los carriers tienen cliente_id)
UPDATE generated_allocation_plans gap
SET cliente_id = (
    SELECT c.cliente_id 
    FROM carriers c 
    WHERE c.id = gap.carrier_id
    LIMIT 1
)
WHERE gap.cliente_id IS NULL;

-- Si aún hay registros sin cliente_id, intentar desde producto_id
UPDATE generated_allocation_plans gap
SET cliente_id = (
    SELECT p.cliente_id 
    FROM productos_cliente p 
    WHERE p.id = gap.producto_id
    LIMIT 1
)
WHERE gap.cliente_id IS NULL;

-- Si todavía hay registros sin cliente_id, asignar al primer cliente
UPDATE generated_allocation_plans
SET cliente_id = (SELECT id FROM clientes ORDER BY fecha_alta LIMIT 1)
WHERE cliente_id IS NULL;

-- 2.2 generated_allocation_plan_details
-- Inferir desde la tabla padre generated_allocation_plans
UPDATE generated_allocation_plan_details gapd
SET cliente_id = (
    SELECT gap.cliente_id 
    FROM generated_allocation_plans gap 
    WHERE gap.id = gapd.plan_id
    LIMIT 1
)
WHERE gapd.cliente_id IS NULL;

-- ========================================
-- FASE 3: VALIDAR INTEGRIDAD
-- ========================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM generated_allocation_plans WHERE cliente_id IS NULL) THEN
        RAISE EXCEPTION 'ERROR: Hay generated_allocation_plans sin cliente_id';
    END IF;
    
    IF EXISTS (SELECT 1 FROM generated_allocation_plan_details WHERE cliente_id IS NULL) THEN
        RAISE EXCEPTION 'ERROR: Hay generated_allocation_plan_details sin cliente_id';
    END IF;
    
    RAISE NOTICE 'VALIDACIÓN OK: Todos los registros tienen cliente_id';
END $$;

-- ========================================
-- FASE 4: HACER NOT NULL Y AGREGAR CONSTRAINTS
-- ========================================

-- 4.1 generated_allocation_plans
ALTER TABLE generated_allocation_plans ALTER COLUMN cliente_id SET NOT NULL;
ALTER TABLE generated_allocation_plans 
ADD CONSTRAINT fk_generated_allocation_plans_cliente 
FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_generated_allocation_plans_cliente_id 
ON generated_allocation_plans(cliente_id);

-- 4.2 generated_allocation_plan_details
ALTER TABLE generated_allocation_plan_details ALTER COLUMN cliente_id SET NOT NULL;
ALTER TABLE generated_allocation_plan_details 
ADD CONSTRAINT fk_generated_allocation_plan_details_cliente 
FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_generated_allocation_plan_details_cliente_id 
ON generated_allocation_plan_details(cliente_id);

-- ========================================
-- FASE 5: HABILITAR RLS
-- ========================================

ALTER TABLE generated_allocation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_allocation_plan_details ENABLE ROW LEVEL SECURITY;

-- ========================================
-- FASE 6: CREAR POLÍTICAS RLS
-- ========================================

-- 6.1 generated_allocation_plans - Superadmins pueden ver todo
DROP POLICY IF EXISTS "Superadmins can manage all generated plans" ON generated_allocation_plans;
CREATE POLICY "Superadmins can manage all generated plans"
ON generated_allocation_plans
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

-- 6.2 generated_allocation_plans - Usuarios pueden ver/gestionar los de su cliente
DROP POLICY IF EXISTS "Users can manage generated plans in their cliente" ON generated_allocation_plans;
CREATE POLICY "Users can manage generated plans in their cliente"
ON generated_allocation_plans
FOR ALL
USING (cliente_id = public.get_user_cliente_id())
WITH CHECK (cliente_id = public.get_user_cliente_id());

-- 6.3 generated_allocation_plan_details - Superadmins pueden ver todo
DROP POLICY IF EXISTS "Superadmins can manage all plan details" ON generated_allocation_plan_details;
CREATE POLICY "Superadmins can manage all plan details"
ON generated_allocation_plan_details
FOR ALL
USING (public.has_role(public.get_current_user_id(), 'superadmin'))
WITH CHECK (public.has_role(public.get_current_user_id(), 'superadmin'));

-- 6.4 generated_allocation_plan_details - Usuarios pueden ver/gestionar los de su cliente
DROP POLICY IF EXISTS "Users can manage plan details in their cliente" ON generated_allocation_plan_details;
CREATE POLICY "Users can manage plan details in their cliente"
ON generated_allocation_plan_details
FOR ALL
USING (cliente_id = public.get_user_cliente_id())
WITH CHECK (cliente_id = public.get_user_cliente_id());

-- ========================================
-- FASE 7: VERIFICACIÓN FINAL
-- ========================================

-- 7.1 Verificar que RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename LIKE 'generated_allocation%'
ORDER BY tablename;

-- 7.2 Verificar que las políticas existen
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename LIKE 'generated_allocation%'
ORDER BY tablename, policyname;

-- 7.3 Verificar que todos los registros tienen cliente_id
SELECT 
    'generated_allocation_plans' as tabla,
    COUNT(*) as total,
    COUNT(cliente_id) as con_cliente_id,
    COUNT(*) - COUNT(cliente_id) as sin_cliente_id
FROM generated_allocation_plans
UNION ALL
SELECT 
    'generated_allocation_plan_details',
    COUNT(*),
    COUNT(cliente_id),
    COUNT(*) - COUNT(cliente_id)
FROM generated_allocation_plan_details;

-- ========================================
-- ÉXITO
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '✅ cliente_id agregado a 2 tablas';
    RAISE NOTICE '✅ RLS habilitado en 2 tablas';
    RAISE NOTICE '✅ 4 políticas RLS creadas (simplificadas)';
END $$;
