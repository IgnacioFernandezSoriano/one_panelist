# Opciones de API para Acceso de n8n a Base de Datos
## Seguridad y Aislamiento por Cliente

---

## 🎯 Requisito Principal

El agente n8n debe acceder a los datos de la base de datos con **aislamiento por cliente**, es decir:
- Cada cliente solo puede ver y modificar sus propios datos
- No puede acceder a datos de otros clientes
- El sistema debe ser seguro y auditable

---

## 📊 Opciones Disponibles

### **Opción 1: Supabase REST API (RECOMENDADA) ✅**

**Descripción**: Usar la API REST nativa de Supabase con Row Level Security (RLS).

#### ✅ **Ventajas**
- **Ya implementado**: Supabase ya tiene RLS configurado en todas las tablas
- **Seguridad automática**: Las políticas RLS filtran automáticamente por cliente
- **Sin código adicional**: No requiere crear endpoints custom
- **Autenticación integrada**: Usa JWT tokens de Supabase
- **Auditoría**: Logs automáticos de todas las operaciones

#### ⚠️ **Consideraciones**
- Requiere autenticación con Service Role Key o User JWT
- Las políticas RLS deben estar correctamente configuradas

#### 🔧 **Cómo Funciona**

**1. Autenticación con Service Role Key** (para operaciones del sistema):

```javascript
// En n8n, configurar HTTP Request node
URL: https://rpasddacpejcjgyfyrsx.supabase.co/rest/v1/generated_allocation_plan_details
Method: GET
Headers:
  - apikey: [SUPABASE_SERVICE_ROLE_KEY]
  - Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]
  - Content-Type: application/json

Query Parameters:
  - status=eq.PENDING
  - cliente_id=eq.13
  - select=*
```

**2. Autenticación con User JWT** (para operaciones de usuario):

```javascript
// Primero, autenticar usuario en Supabase
POST https://rpasddacpejcjgyfyrsx.supabase.co/auth/v1/token?grant_type=password
Body: {
  "email": "user@example.com",
  "password": "password"
}

// Respuesta incluye access_token
// Usar ese token en requests subsecuentes
URL: https://rpasddacpejcjgyfyrsx.supabase.co/rest/v1/generated_allocation_plan_details
Headers:
  - apikey: [SUPABASE_ANON_KEY]
  - Authorization: Bearer [USER_ACCESS_TOKEN]
```

#### 📝 **Ejemplos de Consultas**

**Obtener eventos PENDING de un cliente**:
```
GET /rest/v1/generated_allocation_plan_details?status=eq.PENDING&cliente_id=eq.13&select=*
```

**Obtener panelista por nodo**:
```
GET /rest/v1/panelistas?nodo_asignado=eq.0001-0001-0001-0003&estado=eq.activo&cliente_id=eq.13
```

**Actualizar estado de evento**:
```
PATCH /rest/v1/generated_allocation_plan_details?id=eq.128
Body: {
  "status": "NOTIFIED"
}
```

**Registrar recepción**:
```
PATCH /rest/v1/generated_allocation_plan_details?id=eq.128
Body: {
  "status": "RECEIVED",
  "fecha_recepcion_real": "2025-11-06T10:30:00Z"
}
```

#### 🔐 **Seguridad con RLS**

Las políticas RLS ya configuradas en Supabase aseguran que:

```sql
-- Ejemplo de política RLS en generated_allocation_plan_details
CREATE POLICY "Users can manage plan details in their cliente"
ON public.generated_allocation_plan_details
FOR ALL
TO authenticated
USING (cliente_id = get_user_cliente_id())
WITH CHECK (cliente_id = get_user_cliente_id());
```

Esto significa que **automáticamente**:
- Un usuario solo puede ver eventos de su cliente
- No puede modificar eventos de otros clientes
- No necesita filtrar manualmente por cliente_id en cada query

#### 📚 **Documentación de Supabase REST API**
- Sintaxis de queries: https://postgrest.org/en/stable/api.html
- Filtros: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in`
- Ordenamiento: `order=fecha_programada.asc`
- Límite: `limit=10`
- Selección de campos: `select=id,nodo_origen,nodo_destino`

---

### **Opción 2: Edge Functions de Supabase**

**Descripción**: Crear funciones serverless en Supabase que encapsulen la lógica de negocio.

#### ✅ **Ventajas**
- **Lógica centralizada**: Toda la lógica en un solo lugar
- **Validaciones custom**: Puedes agregar validaciones complejas
- **Transacciones**: Puedes ejecutar múltiples operaciones atómicamente
- **Seguridad adicional**: Control total sobre qué datos se exponen

#### ⚠️ **Consideraciones**
- Requiere desarrollo adicional
- Requiere despliegue y mantenimiento
- Más complejo que usar REST API directamente

#### 🔧 **Ejemplo de Edge Function**

```typescript
// supabase/functions/notify-event/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const { eventId, clienteId } = await req.json()
  
  // Crear cliente de Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  // 1. Obtener evento
  const { data: event } = await supabase
    .from('generated_allocation_plan_details')
    .select('*')
    .eq('id', eventId)
    .eq('cliente_id', clienteId)
    .single()
  
  if (!event) {
    return new Response('Event not found', { status: 404 })
  }
  
  // 2. Obtener panelistas
  const { data: panelistaOrigen } = await supabase
    .from('panelistas')
    .select('*')
    .eq('nodo_asignado', event.nodo_origen)
    .eq('cliente_id', clienteId)
    .eq('estado', 'activo')
    .single()
  
  const { data: panelistaDestino } = await supabase
    .from('panelistas')
    .select('*')
    .eq('nodo_asignado', event.nodo_destino)
    .eq('cliente_id', clienteId)
    .eq('estado', 'activo')
    .single()
  
  // 3. Actualizar estado
  await supabase
    .from('generated_allocation_plan_details')
    .update({ status: 'NOTIFIED' })
    .eq('id', eventId)
  
  // 4. Retornar datos para notificación
  return new Response(
    JSON.stringify({
      event,
      panelistaOrigen,
      panelistaDestino
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

**Llamar desde n8n**:
```
POST https://rpasddacpejcjgyfyrsx.supabase.co/functions/v1/notify-event
Headers:
  - Authorization: Bearer [SUPABASE_ANON_KEY]
Body: {
  "eventId": 128,
  "clienteId": 13
}
```

---

### **Opción 3: API Custom en el Backend de la Aplicación**

**Descripción**: Crear endpoints REST en tu aplicación React/Node.js.

#### ✅ **Ventajas**
- **Control total**: Puedes implementar cualquier lógica
- **Integración con lógica existente**: Reutilizar código de la app
- **Middleware custom**: Autenticación, logging, rate limiting

#### ⚠️ **Consideraciones**
- Requiere servidor backend adicional
- Más infraestructura que mantener
- Duplicación de lógica entre frontend y backend

#### 🔧 **Ejemplo con Express.js**

```javascript
// server/routes/events.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Middleware de autenticación
const authenticateClient = async (req, res, next) => {
  const clienteId = req.headers['x-cliente-id'];
  const apiKey = req.headers['x-api-key'];
  
  // Validar API key y cliente
  // ... lógica de validación
  
  req.clienteId = clienteId;
  next();
};

// GET /api/events/pending
router.get('/pending', authenticateClient, async (req, res) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data, error } = await supabase
    .from('generated_allocation_plan_details')
    .select('*')
    .eq('status', 'PENDING')
    .eq('cliente_id', req.clienteId);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
});

// PATCH /api/events/:id/notify
router.patch('/:id/notify', authenticateClient, async (req, res) => {
  const { id } = req.params;
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Verificar que el evento pertenece al cliente
  const { data: event } = await supabase
    .from('generated_allocation_plan_details')
    .select('*')
    .eq('id', id)
    .eq('cliente_id', req.clienteId)
    .single();
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  // Actualizar estado
  const { data, error } = await supabase
    .from('generated_allocation_plan_details')
    .update({ status: 'NOTIFIED' })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
});

module.exports = router;
```

---

### **Opción 4: Conexión Directa a PostgreSQL**

**Descripción**: n8n se conecta directamente a la base de datos PostgreSQL.

#### ✅ **Ventajas**
- **Máxima flexibilidad**: Puedes ejecutar cualquier query SQL
- **Rendimiento**: Sin capa intermedia

#### ❌ **Desventajas**
- **SIN SEGURIDAD AUTOMÁTICA**: No se aplican políticas RLS
- **Requiere filtrado manual**: Debes agregar `WHERE cliente_id = ?` en TODAS las queries
- **Riesgo de error**: Un query sin filtro puede exponer datos de todos los clientes
- **No recomendado para producción**

#### ⚠️ **Solo usar si**:
- Tienes control total sobre las queries
- Implementas validación estricta de cliente_id
- Tienes logging y auditoría completos

---

## 🏆 Recomendación Final

### **Para n8n: Usar Opción 1 (Supabase REST API) ✅**

**Razones**:

1. **Seguridad garantizada**: RLS se aplica automáticamente
2. **Sin desarrollo adicional**: Ya está listo para usar
3. **Fácil de implementar**: HTTP Request nodes en n8n
4. **Auditable**: Todos los logs en Supabase
5. **Escalable**: Maneja múltiples clientes sin cambios

### **Implementación Recomendada**

**Paso 1: Crear Service Account en Supabase**

Crear un usuario específico para n8n con permisos limitados:

```sql
-- Crear usuario para n8n
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('n8n-agent@system.local', crypt('secure-password', gen_salt('bf')), NOW());

-- Asignar rol específico
INSERT INTO user_roles (user_id, role)
SELECT id, 'system_agent'
FROM auth.users
WHERE email = 'n8n-agent@system.local';
```

**Paso 2: Configurar n8n con Credenciales**

En n8n, crear una credencial tipo "Header Auth":
- Name: `Supabase-Auth`
- Header Name: `Authorization`
- Header Value: `Bearer [SERVICE_ROLE_KEY]`

Agregar otra credencial para API Key:
- Name: `Supabase-API-Key`
- Header Name: `apikey`
- Header Value: `[SERVICE_ROLE_KEY]`

**Paso 3: Crear Workflow en n8n**

```
[Cron Trigger] 
  → [HTTP Request: Get PENDING Events]
  → [Split In Batches]
  → [HTTP Request: Get Panelista Origen]
  → [HTTP Request: Get Panelista Destino]
  → [Function: Prepare Notification]
  → [HTTP Request: Send WhatsApp/Telegram]
  → [HTTP Request: Update Event to NOTIFIED]
```

**Paso 4: Ejemplo de HTTP Request Node**

```json
{
  "url": "https://rpasddacpejcjgyfyrsx.supabase.co/rest/v1/generated_allocation_plan_details",
  "method": "GET",
  "headers": {
    "apikey": "={{$credentials.supabaseApiKey}}",
    "Authorization": "Bearer ={{$credentials.supabaseAuth}}",
    "Content-Type": "application/json"
  },
  "qs": {
    "status": "eq.PENDING",
    "cliente_id": "eq.13",
    "select": "*"
  }
}
```

---

## 🔐 Gestión de Cliente ID

### **Opción A: Cliente ID por Workflow**

Cada cliente tiene su propio workflow en n8n con su `cliente_id` hardcoded.

**Ventajas**:
- Simple de implementar
- Aislamiento completo entre clientes
- Fácil de auditar

**Desventajas**:
- Duplicación de workflows
- Mantenimiento más complejo

### **Opción B: Cliente ID Dinámico**

Un solo workflow que procesa múltiples clientes.

```
[Cron Trigger]
  → [HTTP Request: Get All Active Clientes]
  → [Split In Batches]
  → [Set: clienteId]
  → [HTTP Request: Get PENDING Events for Cliente]
  → ...
```

**Ventajas**:
- Un solo workflow que mantener
- Escalable a muchos clientes

**Desventajas**:
- Más complejo
- Requiere manejo cuidadoso de cliente_id

---

## 📝 Checklist de Seguridad

Antes de poner en producción, verificar:

- [ ] Las políticas RLS están activas en todas las tablas
- [ ] Service Role Key está en variable de entorno segura
- [ ] Todas las queries filtran por `cliente_id`
- [ ] Logs de auditoría están activados
- [ ] Rate limiting configurado en Supabase
- [ ] Webhooks tienen autenticación
- [ ] Errores no exponen información sensible
- [ ] Backups automáticos configurados

---

## 📞 Próximos Pasos

1. **Decidir**: ¿Opción 1 (REST API) u Opción 2 (Edge Functions)?
2. **Configurar**: Credenciales en n8n
3. **Probar**: Con un cliente de prueba primero
4. **Monitorear**: Logs y métricas en producción
5. **Documentar**: Flujos y procedimientos

---

## 🆘 Soporte

Para dudas sobre implementación o seguridad, contactar al equipo de desarrollo.
