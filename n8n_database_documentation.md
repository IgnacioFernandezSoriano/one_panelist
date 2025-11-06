# Documentación de Base de Datos para Agente n8n
## Sistema de Notificaciones y Registro de Eventos

---

## 📋 Resumen del Flujo

El agente n8n debe:
1. **Notificar a panelistas** cuando un evento cambia de estado PENDING → NOTIFIED
2. **Registrar declaraciones de recepción** cuando el panelista confirma recepción
3. **Resolver panelistas** consultando la asignación del nodo en el momento de la notificación

---

## 🗄️ Tablas de Base de Datos Necesarias

### 1. **generated_allocation_plan_details** (Tabla Principal de Eventos)

**Propósito**: Contiene todos los eventos del plan de asignación con su estado actual.

**Ubicación**: `public.generated_allocation_plan_details`

**Campos Relevantes**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | ID único del evento |
| `plan_id` | integer | Referencia al plan padre |
| `nodo_origen` | varchar | Código del nodo de origen (ej: "0001-0001-0001-0003") |
| `nodo_destino` | varchar | Código del nodo de destino (ej: "0001-0001-0002-0001") |
| `fecha_programada` | date | Fecha programada del envío |
| `producto_id` | integer | ID del producto a enviar |
| `carrier_id` | integer | ID del carrier/transportista |
| `cliente_id` | integer | ID del cliente/account |
| `status` | varchar(50) | Estado del evento: PENDING, NOTIFIED, SENT, RECEIVED, CONFIRMED, COMPLETED, CANCELLED |
| `numero_etiqueta` | varchar(255) | Número de seguimiento/tracking (se asigna al enviar) |
| `fecha_envio_real` | timestamptz | Fecha/hora real cuando se envió |
| `fecha_recepcion_real` | timestamptz | Fecha/hora real cuando se recibió |
| `created_at` | timestamptz | Fecha de creación del registro |

**Consulta para eventos PENDING que necesitan notificación**:
```sql
SELECT * FROM generated_allocation_plan_details
WHERE status = 'PENDING'
  AND cliente_id = ?
  AND fecha_programada >= CURRENT_DATE
ORDER BY fecha_programada ASC;
```

**Actualizar evento a NOTIFIED**:
```sql
UPDATE generated_allocation_plan_details
SET status = 'NOTIFIED'
WHERE id = ?;
```

**Registrar recepción**:
```sql
UPDATE generated_allocation_plan_details
SET status = 'RECEIVED',
    fecha_recepcion_real = NOW()
WHERE id = ?;
```

---

### 2. **nodos** (Información de Nodos)

**Propósito**: Contiene información básica de cada nodo.

**Ubicación**: `public.nodos`

**Campos Relevantes**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `codigo` | varchar(50) | Código único del nodo (PRIMARY KEY) |
| `nombre` | varchar(200) | Nombre descriptivo del nodo |
| `ciudad_id` | integer | ID de la ciudad donde está el nodo |
| `pais` | varchar(100) | País del nodo |
| `tipo` | varchar(20) | Tipo: urbano, rural, centro_logistico |
| `estado` | varchar(20) | Estado: activo, inactivo |
| `panelista_id` | integer | ID del panelista asignado (puede ser NULL) |

**Nota Importante**: La columna `panelista_id` se agregó recientemente para almacenar la asignación cuando se notifica el evento.

**Consulta para obtener info del nodo**:
```sql
SELECT codigo, nombre, ciudad_id, panelista_id
FROM nodos
WHERE codigo = ?;
```

---

### 3. **panelistas** (Información de Panelistas)

**Propósito**: Contiene la información de contacto y configuración de cada panelista.

**Ubicación**: `public.panelistas`

**Campos Relevantes**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | ID único del panelista |
| `nombre_completo` | varchar(200) | Nombre completo del panelista |
| `direccion_calle` | varchar(300) | Dirección completa |
| `direccion_ciudad` | varchar(100) | Ciudad |
| `direccion_codigo_postal` | varchar(20) | Código postal |
| `direccion_pais` | varchar(100) | País |
| `telefono` | varchar(20) | Número de teléfono (UNIQUE) |
| `email` | varchar(200) | Email del panelista |
| `idioma` | varchar(2) | Idioma: EN, FR, AR, SP |
| `plataforma_preferida` | varchar(20) | Plataforma: whatsapp, telegram |
| `zona_horaria` | varchar(50) | Zona horaria del panelista |
| `horario_inicio` | time | Hora de inicio de disponibilidad |
| `horario_fin` | time | Hora de fin de disponibilidad |
| `nodo_asignado` | varchar(50) | Código del nodo asignado (FK a nodos.codigo) |
| `estado` | varchar(20) | Estado: activo, inactivo |
| `cliente_id` | integer | ID del cliente al que pertenece |

**Consulta para obtener panelista por nodo**:
```sql
SELECT id, nombre_completo, telefono, email, idioma, plataforma_preferida,
       zona_horaria, horario_inicio, horario_fin
FROM panelistas
WHERE nodo_asignado = ?
  AND estado = 'activo'
  AND cliente_id = ?;
```

**Consulta para obtener panelista por ID**:
```sql
SELECT id, nombre_completo, telefono, email, idioma, plataforma_preferida,
       zona_horaria, horario_inicio, horario_fin
FROM panelistas
WHERE id = ?;
```

---

### 4. **bajas_programadas** (Bajas Temporales de Panelistas)

**Propósito**: Registra períodos de ausencia temporal de panelistas.

**Ubicación**: `public.bajas_programadas`

**Campos Relevantes**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | ID único de la baja |
| `panelista_id` | integer | ID del panelista |
| `fecha_inicio` | date | Fecha de inicio de la baja |
| `fecha_fin` | date | Fecha de fin de la baja |
| `motivo` | varchar(255) | Motivo de la baja |
| `cliente_id` | integer | ID del cliente |
| `created_at` | timestamptz | Fecha de creación |

**Consulta para verificar si panelista está de baja**:
```sql
SELECT * FROM bajas_programadas
WHERE panelista_id = ?
  AND fecha_inicio <= ?
  AND fecha_fin >= ?
  AND cliente_id = ?;
```

---

### 5. **productos_cliente** (Información de Productos)

**Propósito**: Contiene información de los productos que se envían.

**Ubicación**: `public.productos_cliente`

**Campos Relevantes**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | ID único del producto |
| `codigo_producto` | varchar(50) | Código del producto |
| `nombre_producto` | varchar(200) | Nombre descriptivo |
| `descripcion` | text | Descripción del producto |
| `cliente_id` | integer | ID del cliente |

**Consulta para obtener info del producto**:
```sql
SELECT id, codigo_producto, nombre_producto, descripcion
FROM productos_cliente
WHERE id = ?;
```

---

### 6. **carriers** (Información de Transportistas)

**Propósito**: Contiene información de los carriers/transportistas.

**Ubicación**: `public.carriers`

**Campos Relevantes**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | ID único del carrier |
| `commercial_name` | varchar(200) | Nombre comercial |
| `contact_email` | varchar(200) | Email de contacto |
| `contact_phone` | varchar(20) | Teléfono de contacto |
| `cliente_id` | integer | ID del cliente |

**Consulta para obtener info del carrier**:
```sql
SELECT id, commercial_name, contact_email, contact_phone
FROM carriers
WHERE id = ?;
```

---

### 7. **ciudades** (Información de Ciudades)

**Propósito**: Contiene información de las ciudades donde están los nodos.

**Ubicación**: `public.ciudades`

**Campos Relevantes**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | ID único de la ciudad |
| `nombre` | varchar(200) | Nombre de la ciudad |
| `codigo_postal` | varchar(20) | Código postal |
| `clasificacion` | varchar(50) | Clasificación de la ciudad |
| `region_id` | integer | ID de la región |
| `cliente_id` | integer | ID del cliente |

---

## 🔄 Flujo de Trabajo para n8n

### **Paso 1: Detectar Eventos PENDING que necesitan notificación**

```sql
SELECT 
  e.id,
  e.nodo_origen,
  e.nodo_destino,
  e.fecha_programada,
  e.producto_id,
  e.carrier_id,
  e.cliente_id
FROM generated_allocation_plan_details e
WHERE e.status = 'PENDING'
  AND e.cliente_id = ?
  AND e.fecha_programada >= CURRENT_DATE
ORDER BY e.fecha_programada ASC;
```

### **Paso 2: Resolver Panelistas de Origen y Destino**

Para cada evento detectado:

**2.1. Obtener panelista del nodo de origen**:
```sql
SELECT p.id, p.nombre_completo, p.telefono, p.email, p.idioma, p.plataforma_preferida
FROM panelistas p
WHERE p.nodo_asignado = ? -- nodo_origen del evento
  AND p.estado = 'activo'
  AND p.cliente_id = ?;
```

**2.2. Obtener panelista del nodo de destino**:
```sql
SELECT p.id, p.nombre_completo, p.telefono, p.email, p.idioma, p.plataforma_preferida
FROM panelistas p
WHERE p.nodo_asignado = ? -- nodo_destino del evento
  AND p.estado = 'activo'
  AND p.cliente_id = ?;
```

**2.3. Verificar si algún panelista está de baja**:
```sql
SELECT * FROM bajas_programadas
WHERE panelista_id = ?
  AND fecha_inicio <= ? -- fecha_programada del evento
  AND fecha_fin >= ? -- fecha_programada del evento
  AND cliente_id = ?;
```

### **Paso 3: Guardar Asignación de Panelistas en el Nodo**

Cuando se notifica el evento, guardar el panelista asignado en el nodo:

```sql
UPDATE nodos
SET panelista_id = ?
WHERE codigo = ?;
```

### **Paso 4: Actualizar Estado del Evento a NOTIFIED**

```sql
UPDATE generated_allocation_plan_details
SET status = 'NOTIFIED'
WHERE id = ?;
```

### **Paso 5: Enviar Notificación al Panelista**

Usar la información del panelista:
- `plataforma_preferida`: whatsapp o telegram
- `telefono`: número de contacto
- `idioma`: idioma del mensaje
- `zona_horaria`: para respetar horarios
- `horario_inicio` / `horario_fin`: ventana de envío

### **Paso 6: Registrar Recepción (cuando el panelista confirma)**

```sql
UPDATE generated_allocation_plan_details
SET status = 'RECEIVED',
    fecha_recepcion_real = NOW()
WHERE id = ?;
```

---

## 🔐 Credenciales de Conexión

**Base de Datos**: PostgreSQL (Supabase)

**URL de Conexión**: `https://rpasddacpejcjgyfyrsx.supabase.co`

**Nota**: Las credenciales de conexión (usuario, contraseña, API keys) deben ser proporcionadas por el administrador del sistema.

---

## 📝 Notas Importantes

1. **Dual-Source Panelist Detection**: Los panelistas pueden estar asignados en dos lugares:
   - En `panelistas.nodo_asignado` (asignación permanente)
   - En `nodos.panelista_id` (asignación en el momento de notificación)

2. **Estados del Evento**: 
   - PENDING → Evento creado, esperando notificación
   - NOTIFIED → Panelista notificado, esperando envío
   - SENT → Enviado por panelista origen
   - RECEIVED → Recibido por panelista destino
   - CONFIRMED → Confirmado por sistema
   - COMPLETED → Completado
   - CANCELLED → Cancelado

3. **Eventos en Riesgo**: Si un panelista está de baja durante la fecha programada del evento, el evento se considera "en riesgo" y debe ser reasignado.

4. **Cliente ID**: Todas las consultas deben filtrar por `cliente_id` para asegurar aislamiento de datos entre clientes.

---

## 📞 Contacto

Para dudas sobre el esquema de base de datos o acceso, contactar al administrador del sistema.
