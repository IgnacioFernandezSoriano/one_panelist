# Configuración del Cron Job para Cambios Programados de Panelistas

## 📋 Resumen

La Edge Function `process-scheduled-panelist-changes` debe ejecutarse diariamente a las 00:00 UTC para:
1. **Aplicar** cambios programados que inician hoy
2. **Revertir** cambios programados que terminaron ayer

## 🚀 Pasos para configurar el Cron Job en Supabase

### 1. Desplegar la Edge Function

```bash
# Desde la raíz del proyecto
supabase functions deploy process-scheduled-panelist-changes
```

### 2. Configurar Cron en Supabase Dashboard

#### Opción A: Usando pg_cron (Recomendado - Requiere plan Pro)

1. Ve a **Supabase Dashboard** → Tu proyecto
2. **SQL Editor** → New query
3. Ejecuta este SQL:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run daily at 00:00 UTC
SELECT cron.schedule(
  'process-scheduled-panelist-changes',  -- Job name
  '0 0 * * *',                           -- Cron expression (daily at midnight UTC)
  $$
  SELECT
    net.http_post(
      url := 'https://wroxljjsejbfuzddqjqi.supabase.co/functions/v1/process-scheduled-panelist-changes',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Verify the job was created
SELECT * FROM cron.job WHERE jobname = 'process-scheduled-panelist-changes';
```

4. **Importante**: Configura la variable `app.settings.service_role_key`:

```sql
-- Set service role key (replace with your actual key)
ALTER DATABASE postgres SET app.settings.service_role_key TO 'your-service-role-key-here';
```

#### Opción B: Usando servicio externo (Alternativa gratuita)

Si no tienes plan Pro, usa un servicio como **cron-job.org**:

1. Registrarte en https://cron-job.org
2. Crear nuevo cron job:
   - **URL**: `https://wroxljjsejbfuzddqjqi.supabase.co/functions/v1/process-scheduled-panelist-changes`
   - **Schedule**: `0 0 * * *` (diario a las 00:00 UTC)
   - **Headers**:
     - `Authorization: Bearer YOUR_ANON_KEY`
     - `Content-Type: application/json`
   - **Method**: POST
   - **Body**: `{}`

### 3. Verificar funcionamiento

#### Prueba manual:

```bash
# Usando curl
curl -X POST \
  'https://wroxljjsejbfuzddqjqi.supabase.co/functions/v1/process-scheduled-panelist-changes' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

#### Monitorear logs:

```bash
# Ver logs de la función
supabase functions logs process-scheduled-panelist-changes
```

O en Supabase Dashboard:
- **Edge Functions** → `process-scheduled-panelist-changes` → **Logs**

### 4. Verificar ejecuciones del cron

```sql
-- Ver historial de ejecuciones (si usas pg_cron)
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-scheduled-panelist-changes')
ORDER BY start_time DESC
LIMIT 10;
```

## 🔍 Troubleshooting

### El cron no se ejecuta

1. Verifica que la función esté desplegada:
   ```bash
   supabase functions list
   ```

2. Verifica que el cron esté activo:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-scheduled-panelist-changes';
   ```

3. Revisa los logs de pg_cron:
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
   ```

### Errores de autenticación

Asegúrate de que la `service_role_key` esté configurada correctamente:

```sql
-- Verificar configuración
SHOW app.settings.service_role_key;
```

### Cambios no se aplican

1. Verifica que haya cambios pendientes:
   ```sql
   SELECT * FROM scheduled_panelist_changes 
   WHERE status = 'pending' AND fecha_inicio = CURRENT_DATE;
   ```

2. Ejecuta manualmente las funciones SQL:
   ```sql
   SELECT * FROM apply_scheduled_panelist_changes();
   SELECT * FROM revert_scheduled_panelist_changes();
   ```

## 📊 Monitoreo

Para monitorear el estado de los cambios programados:

```sql
-- Ver todos los cambios programados
SELECT 
  id,
  nodo_codigo,
  panelista_current_id,
  panelista_new_id,
  fecha_inicio,
  fecha_fin,
  status,
  applied_at,
  reverted_at
FROM scheduled_panelist_changes
ORDER BY fecha_inicio DESC;

-- Ver cambios por status
SELECT status, COUNT(*) 
FROM scheduled_panelist_changes 
GROUP BY status;
```

## 🔄 Actualizar el cron

Si necesitas cambiar el horario:

```sql
-- Eliminar cron existente
SELECT cron.unschedule('process-scheduled-panelist-changes');

-- Crear nuevo con diferente horario (ej: 01:00 UTC)
SELECT cron.schedule(
  'process-scheduled-panelist-changes',
  '0 1 * * *',  -- 01:00 UTC
  $$ ... $$  -- Mismo código que antes
);
```

## 📝 Notas importantes

- **Zona horaria**: El cron se ejecuta en UTC. Ajusta según tu zona horaria.
- **Reintentos**: Si falla, no se reintenta automáticamente. Considera implementar alertas.
- **Logs**: Los logs se mantienen por 7 días en Supabase.
- **Límites**: Plan Free tiene límites de invocaciones. Considera plan Pro para producción.
