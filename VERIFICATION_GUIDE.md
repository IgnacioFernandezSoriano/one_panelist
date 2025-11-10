# 🧪 Guía de Verificación - Sistema de Cambios Programados de Panelistas

## ✅ Checklist de Implementación

### 1. Base de Datos ✅
- [x] Tabla `scheduled_panelist_changes` creada
- [x] Función `apply_scheduled_panelist_changes()` creada
- [x] Función `revert_scheduled_panelist_changes()` creada
- [x] Políticas RLS configuradas

### 2. Frontend ✅
- [x] `MassivePanelistChange.tsx` reescrito
- [x] `ScheduledChanges.tsx` creado
- [x] Rutas agregadas en `App.tsx`
- [x] Menú actualizado en `AppLayout.tsx`

### 3. Backend ✅
- [x] Edge Function `process-scheduled-panelist-changes` desplegada
- [x] Cron job configurado en cron-job.org (cada hora)

---

## 🧪 Pruebas Manuales

### Prueba 1: Crear un cambio programado

1. **Acceder a la aplicación**
   - URL: https://one-panelist.netlify.app
   - Login con usuario DEMO

2. **Navegar a Massive Panelist Change**
   - Menú: **Panelists → Massive Panelist Change**

3. **Configurar un cambio de prueba**
   - **Current Panelist**: Seleccionar un panelista que tenga nodo asignado
   - **New Panelist**: Seleccionar un panelista SIN nodo asignado
   - **From Date**: Mañana (para probar sin afectar hoy)
   - **To Date**: Pasado mañana
   - **Reason**: "Prueba de cambio programado"

4. **Preview y confirmar**
   - Click en **"Preview Changes"**
   - Verificar el resumen
   - Click en **"Confirm Change"**

5. **Verificar creación**
   - Debería aparecer mensaje de éxito
   - El cambio debería estar en status "pending"

### Prueba 2: Ver cambios programados

1. **Navegar a Scheduled Changes**
   - Menú: **Panelists → Scheduled Changes**

2. **Verificar la lista**
   - Debería aparecer el cambio creado en Prueba 1
   - Status: **Pending** (badge amarillo)
   - Fechas correctas
   - Información de panelistas correcta

3. **Filtrar por status**
   - Probar filtros: All, Pending, Active, Completed

### Prueba 3: Cancelar un cambio programado

1. **En Scheduled Changes**
   - Localizar un cambio en status "pending"
   - Click en botón **"Cancel"**

2. **Confirmar cancelación**
   - Debería aparecer diálogo de confirmación
   - Click en **"Confirm"**

3. **Verificar**
   - El cambio debería cambiar a status "cancelled"
   - Badge gris
   - Ya no debería aparecer en filtro "Pending"

### Prueba 4: Verificar Edge Function manualmente

1. **Abrir Postman o similar**

2. **Configurar request**
   ```
   Method: POST
   URL: https://rpasddacpejcjgyfyrsx.supabase.co/functions/v1/process-scheduled-panelist-changes
   
   Headers:
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYXNkZGFjcGVqY2pneWZ5cnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5NzI0MjcsImV4cCI6MjA0NjU0ODQyN30.R5cCI6IkpXVCJ9
   Content-Type: application/json
   ```

3. **Enviar request**

4. **Verificar respuesta**
   ```json
   {
     "success": true,
     "timestamp": "2025-11-07T...",
     "applied_count": 0,
     "reverted_count": 0,
     "applied_changes": [],
     "reverted_changes": []
   }
   ```

### Prueba 5: Verificar cron job

1. **Acceder a cron-job.org**
   - URL: https://console.cron-job.org/jobs
   - Login: ignacio.fernandez@upu.int

2. **Verificar configuración**
   - Nombre: "Process Scheduled Panelist Changes"
   - URL correcta
   - Status: Enabled (icono verde)
   - Próxima ejecución visible

3. **Ver historial**
   - Click en **"History"**
   - Verificar ejecuciones
   - Status codes (200 = éxito)

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
  motivo,
  created_at
FROM scheduled_panelist_changes
ORDER BY created_at DESC;
```

### Consulta 2: Ver nodos asignados de panelistas

```sql
SELECT 
  id,
  nombre,
  apellidos,
  nodo_asignado,
  activo
FROM panelistas
WHERE cliente_id = 13
ORDER BY nombre;
```

### Consulta 3: Probar función de aplicar cambios manualmente

```sql
SELECT * FROM apply_scheduled_panelist_changes();
```

### Consulta 4: Probar función de revertir cambios manualmente

```sql
SELECT * FROM revert_scheduled_panelist_changes();
```

---

## 🚨 Troubleshooting

### Problema: "No panelists found with assigned nodes"

**Causa**: El panelista seleccionado no tiene `nodo_asignado`

**Solución**:
1. Ir a SQL Editor en Supabase
2. Asignar un nodo a un panelista:
   ```sql
   UPDATE panelistas
   SET nodo_asignado = '0001-0001-0001-0001'
   WHERE id = 3 AND cliente_id = 13;
   ```

### Problema: "New panelist has no assigned node"

**Causa**: Intentas asignar a un panelista que YA tiene nodo

**Solución**: Seleccionar un panelista diferente que NO tenga nodo asignado

### Problema: Cron job falla con error 404

**Causa**: Edge Function no está desplegada o nombre incorrecto

**Solución**:
1. Verificar en Supabase Dashboard → Edge Functions
2. Verificar que el nombre sea exactamente: `process-scheduled-panelist-changes`

### Problema: Cron job falla con error 401

**Causa**: Token de autorización incorrecto

**Solución**:
1. Obtener ANON_KEY correcto de Supabase Dashboard → Settings → API
2. Actualizar header en cron-job.org

---

## 📊 Escenario Completo de Prueba

### Día 1 (Hoy): Crear cambio

1. Login como usuario DEMO
2. Ir a **Massive Panelist Change**
3. Configurar:
   - Current: Maria Garcia Lopez (tiene nodo 0001-0001-0001-0001)
   - New: Pedro Sanchez (sin nodo)
   - From: Mañana (Nov 8)
   - To: Nov 10
4. Crear el cambio
5. Verificar en **Scheduled Changes**: Status = "pending"

### Día 2 (Mañana): Aplicar cambio

1. **Automático**: Cron job ejecuta a las 00:00, 01:00, 02:00...
2. La función detecta que fecha_inicio = hoy
3. Ejecuta:
   - Maria: nodo_asignado = NULL
   - Pedro: nodo_asignado = '0001-0001-0001-0001'
4. Cambio pasa a status = "active"

### Día 3 (Nov 9): Cambio activo

- Pedro tiene el nodo asignado
- Los eventos con ese nodo se notifican a Pedro

### Día 4 (Nov 11): Revertir cambio

1. **Automático**: Cron job ejecuta
2. La función detecta que fecha_fin = ayer (Nov 10)
3. Ejecuta:
   - Pedro: nodo_asignado = NULL
   - Maria: nodo_asignado = '0001-0001-0001-0001'
4. Cambio pasa a status = "completed"

---

## 📈 Monitoreo

### Logs de Edge Function

1. Supabase Dashboard → Edge Functions
2. Click en `process-scheduled-panelist-changes`
3. Tab "Logs"
4. Ver ejecuciones y errores

### Logs de Cron Job

1. cron-job.org → Cronjobs
2. Click en "History" del job
3. Ver ejecuciones, status codes, tiempos de respuesta

### Alertas

Si hay errores:
- Edge Function logs mostrarán el stack trace
- Cron job history mostrará status code 500
- Verificar en Supabase SQL Editor si las funciones existen

---

## ✅ Checklist Final

- [ ] Crear cambio programado exitosamente
- [ ] Ver cambio en Scheduled Changes
- [ ] Cancelar un cambio pending
- [ ] Verificar que cron job está activo
- [ ] Probar Edge Function manualmente (Postman)
- [ ] Verificar logs de Edge Function
- [ ] Verificar historial de cron job
- [ ] Esperar a que se aplique un cambio automáticamente
- [ ] Verificar que el nodo se reasignó correctamente
- [ ] Esperar a que se revierta un cambio automáticamente
- [ ] Verificar que el nodo se restauró correctamente

---

## 🎯 Resultado Esperado

**Sistema funcionando correctamente cuando:**

1. ✅ Puedes crear cambios programados desde la UI
2. ✅ Los cambios aparecen en Scheduled Changes
3. ✅ Puedes cancelar cambios pending
4. ✅ El cron job se ejecuta cada hora sin errores
5. ✅ Los cambios se aplican automáticamente en fecha_inicio
6. ✅ Los cambios se revierten automáticamente después de fecha_fin
7. ✅ Los nodos se reasignan correctamente entre panelistas
8. ✅ Multi-tenant security funciona (solo ves tus cambios)

---

## 📞 Soporte

Si algo no funciona:
1. Revisar logs de Edge Function en Supabase
2. Revisar historial de cron job en cron-job.org
3. Ejecutar consultas SQL de verificación
4. Revisar consola del navegador (F12) para errores frontend
