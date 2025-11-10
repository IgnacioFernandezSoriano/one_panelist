# 🧪 Guía de Pruebas - Sistema de Cambios Programados de Panelistas

## 📋 Resumen del Sistema

El sistema permite programar cambios temporales de panelistas que se aplican y revierten automáticamente en fechas específicas, modificando el campo `nodo_asignado` en la tabla `panelistas`.

---

## ✅ Checklist de Pruebas

### 1. Verificar Despliegue

- [ ] Netlify completó el auto-deploy (esperar 2-3 minutos)
- [ ] No hay errores de build en Netlify
- [ ] La aplicación carga correctamente

### 2. Verificar Menú

- [ ] Ir a **Panelists** en el menú lateral
- [ ] Verificar que aparezcan 4 opciones:
  - Vacations
  - Massive Panelist Change
  - **Scheduled Changes** ← NUEVO
  - Panelist Materials Plan

### 3. Probar Creación de Cambio Programado

#### Paso 1: Ir a Massive Panelist Change
- [ ] Click en **Panelists → Massive Panelist Change**
- [ ] Verificar que el título diga "Scheduled Panelist Change"

#### Paso 2: Seleccionar Panelista Actual
- [ ] Abrir desplegable "Current Panelist"
- [ ] Verificar que solo muestre panelistas **con nodo asignado**
- [ ] Seleccionar: **Maria Garcia Lopez (ID: 3) - 0001-0001-0001-0001**

#### Paso 3: Seleccionar Panelista Nuevo
- [ ] Abrir desplegable "New Panelist"
- [ ] Verificar que solo muestre panelistas **sin nodo asignado**
- [ ] Seleccionar un panelista disponible (ej: uno que no tenga nodo)
- [ ] **Alternativa**: Dejar vacío para desasignar temporalmente

#### Paso 4: Seleccionar Fechas
- [ ] **From Date**: Seleccionar mañana o pasado mañana
- [ ] **To Date**: Seleccionar 5-7 días después
- [ ] Verificar que no permita fechas en el pasado

#### Paso 5: Agregar Motivo (opcional)
- [ ] Escribir razón: "Vacation coverage" o similar

#### Paso 6: Preview & Schedule
- [ ] Click en "Preview & Schedule"
- [ ] Verificar que muestre diálogo de confirmación con:
  - Nodo código
  - Panelista actual
  - Panelista temporal
  - Fechas
  - Cantidad de eventos afectados
  - Mensaje sobre ejecución automática

#### Paso 7: Confirmar
- [ ] Click en "Confirm Schedule"
- [ ] Verificar mensaje de éxito
- [ ] Verificar que el formulario se limpie

### 4. Verificar en Scheduled Changes

- [ ] Ir a **Panelists → Scheduled Changes**
- [ ] Verificar que aparezca el cambio recién creado
- [ ] Verificar información:
  - Status: **Pending** (badge amarillo)
  - Node: Código correcto
  - Current Panelist: Nombre correcto
  - New Panelist: Nombre correcto o "Unassigned"
  - Start/End Date: Fechas correctas
  - Events: Cantidad de eventos
- [ ] Si el inicio es en ≤7 días, verificar fondo amarillo y "Starts in X days"

### 5. Probar Filtros

- [ ] Cambiar filtro a "Pending" → Solo cambios pendientes
- [ ] Cambiar filtro a "Active" → Solo cambios activos (vacío si no hay)
- [ ] Cambiar filtro a "Completed" → Solo cambios completados
- [ ] Cambiar filtro a "All Status" → Todos los cambios

### 6. Probar Cancelación

- [ ] Click en botón "Cancel" de un cambio pending
- [ ] Verificar diálogo de confirmación con detalles
- [ ] Click en "Cancel Change"
- [ ] Verificar mensaje de éxito
- [ ] Verificar que el status cambie a "Cancelled" (badge gris)
- [ ] Verificar que ya no aparezca el botón "Cancel"

### 7. Validaciones

#### Validación 1: Panelista sin nodo
- [ ] Intentar crear cambio con panelista actual sin nodo
- [ ] Verificar error: "The selected panelist has no assigned node"

#### Validación 2: Panelista nuevo con nodo
- [ ] Intentar seleccionar panelista nuevo que ya tenga nodo asignado
- [ ] Verificar error: "The selected replacement panelist already has a node assigned"

#### Validación 3: Fechas en el pasado
- [ ] Intentar seleccionar fecha de inicio en el pasado
- [ ] Verificar error: "Start date must be today or in the future"

#### Validación 4: Fecha fin antes de inicio
- [ ] Seleccionar fecha fin antes de fecha inicio
- [ ] Verificar error: "Start date must be before end date"

#### Validación 5: Conflictos de fechas
- [ ] Crear un cambio programado
- [ ] Intentar crear otro cambio para el mismo nodo con fechas solapadas
- [ ] Verificar error: "There is already a scheduled change for this node in the selected date range"

---

## 🔍 Verificación en Base de Datos

### Consulta 1: Ver cambios programados

```sql
SELECT 
  id,
  nodo_codigo,
  panelista_current_id,
  panelista_new_id,
  fecha_inicio,
  fecha_fin,
  status,
  affected_events_count,
  created_at
FROM scheduled_panelist_changes
ORDER BY created_at DESC;
```

### Consulta 2: Ver con nombres de panelistas

```sql
SELECT 
  sc.id,
  sc.nodo_codigo,
  pc.nombre_completo as current_panelist,
  pn.nombre_completo as new_panelist,
  sc.fecha_inicio,
  sc.fecha_fin,
  sc.status,
  sc.motivo
FROM scheduled_panelist_changes sc
LEFT JOIN panelistas pc ON pc.id = sc.panelista_current_id
LEFT JOIN panelistas pn ON pn.id = sc.panelista_new_id
ORDER BY sc.fecha_inicio DESC;
```

### Consulta 3: Verificar nodos asignados actuales

```sql
SELECT 
  id,
  nombre_completo,
  nodo_asignado,
  estado
FROM panelistas
WHERE nodo_asignado IS NOT NULL
ORDER BY nombre_completo;
```

---

## 🤖 Prueba Manual de Funciones SQL

### Probar aplicación de cambios

```sql
-- Simular que hoy es la fecha de inicio de un cambio
-- Primero, actualiza un cambio pending para que inicie hoy
UPDATE scheduled_panelist_changes
SET fecha_inicio = CURRENT_DATE
WHERE status = 'pending'
LIMIT 1;

-- Ejecutar función de aplicación
SELECT * FROM apply_scheduled_panelist_changes();

-- Verificar que el status cambió a 'active'
SELECT * FROM scheduled_panelist_changes WHERE status = 'active';

-- Verificar que el nodo se reasignó
SELECT id, nombre_completo, nodo_asignado 
FROM panelistas 
WHERE id IN (
  SELECT panelista_current_id FROM scheduled_panelist_changes WHERE status = 'active'
  UNION
  SELECT panelista_new_id FROM scheduled_panelist_changes WHERE status = 'active'
);
```

### Probar reversión de cambios

```sql
-- Simular que un cambio activo terminó ayer
UPDATE scheduled_panelist_changes
SET fecha_fin = CURRENT_DATE - INTERVAL '1 day'
WHERE status = 'active'
LIMIT 1;

-- Ejecutar función de reversión
SELECT * FROM revert_scheduled_panelist_changes();

-- Verificar que el status cambió a 'completed'
SELECT * FROM scheduled_panelist_changes WHERE status = 'completed';

-- Verificar que el nodo se restauró
SELECT id, nombre_completo, nodo_asignado 
FROM panelistas 
WHERE id IN (
  SELECT panelista_current_id FROM scheduled_panelist_changes WHERE status = 'completed'
);
```

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: No aparece el menú "Scheduled Changes"
**Solución**: 
- Verificar que Netlify completó el deploy
- Hacer hard refresh (Ctrl+Shift+R)
- Verificar consola del navegador por errores

### Problema 2: Error al crear cambio programado
**Solución**:
- Verificar que la tabla `scheduled_panelist_changes` existe en Supabase
- Verificar RLS policies en Supabase
- Revisar consola del navegador (F12) para ver error específico

### Problema 3: No se cargan los cambios en la lista
**Solución**:
- Verificar que hay cambios creados en la base de datos
- Verificar que el usuario tiene `cliente_id` correcto
- Revisar políticas RLS de la tabla

### Problema 4: No se pueden seleccionar panelistas
**Solución**:
- Verificar que hay panelistas activos en la base de datos
- Para "Current": Verificar que tengan `nodo_asignado` != NULL
- Para "New": Verificar que tengan `nodo_asignado` = NULL

---

## 📊 Escenarios de Prueba Completos

### Escenario 1: Cambio exitoso con nuevo panelista

1. Maria tiene nodo "0001-0001-0001-0001"
2. Pedro no tiene nodo asignado
3. Crear cambio: Maria → Pedro, del 10 al 20 de diciembre
4. Verificar cambio en status "pending"
5. (Simular) Ejecutar función el día 10
6. Verificar: Maria pierde nodo, Pedro recibe nodo, status "active"
7. (Simular) Ejecutar función el día 21
8. Verificar: Pedro pierde nodo, Maria recupera nodo, status "completed"

### Escenario 2: Desasignación temporal

1. Maria tiene nodo "0001-0001-0001-0001"
2. Crear cambio: Maria → (vacío), del 15 al 25 de diciembre
3. Verificar cambio en status "pending"
4. (Simular) Ejecutar función el día 15
5. Verificar: Maria pierde nodo (NULL), status "active"
6. (Simular) Ejecutar función el día 26
7. Verificar: Maria recupera nodo, status "completed"

### Escenario 3: Cancelación antes de aplicar

1. Crear cambio programado para el futuro
2. Ir a Scheduled Changes
3. Cancelar el cambio
4. Verificar status "cancelled"
5. Verificar que no se puede volver a cancelar
6. (Simular) Ejecutar función en la fecha de inicio
7. Verificar que el cambio NO se aplica (sigue cancelled)

---

## ✅ Checklist Final

- [ ] Todos los componentes visuales funcionan correctamente
- [ ] Validaciones previenen errores de usuario
- [ ] Los cambios se crean correctamente en la base de datos
- [ ] Los filtros y búsquedas funcionan
- [ ] La cancelación funciona correctamente
- [ ] Las funciones SQL aplican y revierten cambios correctamente
- [ ] No hay errores en la consola del navegador
- [ ] El sistema es intuitivo y fácil de usar

---

## 📝 Notas para Producción

1. **Configurar cron job**: Seguir instrucciones en `supabase/CRON_SETUP.md`
2. **Monitoreo**: Configurar alertas para fallos en el cron
3. **Logs**: Revisar logs de Edge Function regularmente
4. **Backup**: Hacer backup de `scheduled_panelist_changes` antes de cambios importantes
5. **Documentación**: Capacitar usuarios sobre el flujo de cambios programados
