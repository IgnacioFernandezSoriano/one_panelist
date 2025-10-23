# CSV Import Guide - ONE Postal Quality System

This guide explains how to import data in bulk using CSV files into the ONE Postal Quality Management System.

## How to Import Data

1. Navigate to **Data Import** in the sidebar menu
2. Select the tab for the data type you want to import
3. Click **Download Template** to get a CSV template with the correct format
4. Fill in your data using the template
5. Click **Upload CSV** and select your file
6. Review the import results

## CSV Format Requirements

- Files must be in CSV (Comma-Separated Values) format
- First row must contain column headers (exactly as specified)
- Use UTF-8 encoding
- Date format: `YYYY-MM-DD` (e.g., 2025-11-01)
- Time format: `HH:MM:SS` (e.g., 09:00:00)
- Empty cells are allowed for optional fields

---

## 1. Panelists (panelistas)

### Required Columns
```
nombre_completo, direccion_calle, direccion_ciudad, direccion_codigo_postal, direccion_pais, telefono, email, idioma, plataforma_preferida, zona_horaria, horario_inicio, horario_fin, nodo_asignado, estado
```

### Example CSV:
```csv
nombre_completo,direccion_calle,direccion_ciudad,direccion_codigo_postal,direccion_pais,telefono,email,idioma,plataforma_preferida,zona_horaria,horario_inicio,horario_fin,nodo_asignado,estado
John Doe,123 Main Street,New York,10001,USA,+1234567890,john@example.com,EN,whatsapp,America/New_York,09:00:00,17:00:00,NYC001,activo
Jane Smith,456 Oak Avenue,Los Angeles,90001,USA,+1987654321,jane@example.com,EN,telegram,America/Los_Angeles,08:00:00,16:00:00,LA001,activo
```

### Field Notes:
- **idioma**: Must be EN, FR, AR, or SP
- **plataforma_preferida**: Must be whatsapp or telegram
- **zona_horaria**: Use IANA timezone names (e.g., America/New_York)
- **horario_inicio/horario_fin**: 24-hour format HH:MM:SS
- **estado**: activo, inactivo, or suspendido
- **nodo_asignado**: Must match an existing node code

---

## 2. Nodes (nodos)

### Required Columns
```
codigo, nombre, ciudad, pais, tipo, estado
```

### Example CSV:
```csv
codigo,nombre,ciudad,pais,tipo,estado
NYC001,New York Central Hub,New York,USA,centro_logistico,activo
LA001,Los Angeles Distribution Center,Los Angeles,USA,urbano,activo
CHI001,Chicago Regional Office,Chicago,USA,rural,activo
```

### Field Notes:
- **codigo**: Unique identifier for the node
- **tipo**: Must be urbano, rural, or centro_logistico
- **estado**: activo or inactivo

---

## 3. Clients (clientes)

### Required Columns
```
nombre, codigo, pais, estado
```

### Example CSV:
```csv
nombre,codigo,pais,estado
Acme Corporation,ACME001,USA,activo
Global Logistics Inc,GLOB001,Canada,activo
Euro Post Services,EURO001,France,activo
```

### Field Notes:
- **codigo**: Unique client identifier
- **estado**: activo or inactivo

---

## 4. Shipments (envios)

### Required Columns
```
codigo, cliente_id, nodo_origen, nodo_destino, panelista_origen_id, panelista_destino_id, fecha_programada, fecha_limite, tipo_producto, estado, motivo_creacion
```

### Example CSV:
```csv
codigo,cliente_id,nodo_origen,nodo_destino,panelista_origen_id,panelista_destino_id,fecha_programada,fecha_limite,tipo_producto,estado,motivo_creacion
ENV001,1,NYC001,LA001,1,2,2025-11-01,2025-11-05,carta,PENDIENTE,programado
ENV002,1,LA001,CHI001,2,3,2025-11-03,2025-11-08,paquete,PENDIENTE,programado
ENV003,2,CHI001,NYC001,3,1,2025-11-05,2025-11-10,certificada,NOTIFICADO,programado
```

### Field Notes:
- **cliente_id**: Must match an existing client ID
- **nodo_origen/nodo_destino**: Must match existing node codes
- **panelista_origen_id/panelista_destino_id**: Must match existing panelist IDs
- **fecha_programada/fecha_limite**: Format YYYY-MM-DD
- **estado**: PENDIENTE, NOTIFICADO, ENVIADO, RECIBIDO, or CANCELADO
- **motivo_creacion**: programado, compensatorio_extravio, or compensatorio_no_disponible

---

## 5. Issues (incidencias)

### Required Columns
```
tipo, panelista_id, envio_id, descripcion, origen, prioridad, estado
```

### Example CSV:
```csv
tipo,panelista_id,envio_id,descripcion,origen,prioridad,estado
no_disponible,1,1,Panelist not available for scheduled date,gestor,media,abierta
extravio,2,2,Package reported as lost during transit,sistema,alta,abierta
cambio_direccion,3,,Panelist requested address change,agente,baja,en_proceso
```

### Field Notes:
- **tipo**: cambio_direccion, no_disponible, muestra_dañada, extravio, or problema_generico
- **panelista_id**: Must match an existing panelist ID
- **envio_id**: Optional, leave empty if not related to a shipment
- **origen**: agente, gestor, or sistema
- **prioridad**: baja, media, alta, or critica
- **estado**: abierta, en_proceso, resuelta, or cerrada

---

## 6. Users (usuarios)

### Required Columns
```
nombre_completo, email, password_hash, rol, telefono, estado
```

### Example CSV:
```csv
nombre_completo,email,password_hash,rol,telefono,estado
Admin User,admin@example.com,$2a$10$example_hash,administrador,+1234567890,activo
Manager User,manager@example.com,$2a$10$example_hash,gestor,+1987654321,activo
Coordinator User,coordinator@example.com,$2a$10$example_hash,coordinador,+1555555555,activo
```

### Field Notes:
- **password_hash**: Must be a bcrypt-hashed password (use a tool to generate)
- **rol**: gestor, coordinador, or administrador
- **estado**: activo or inactivo
- **Important**: Never store plain text passwords!

---

## 7. Message Templates (plantillas_mensajes)

### Required Columns
```
codigo, tipo, idioma, contenido, estado
```

### Example CSV:
```csv
codigo,tipo,idioma,contenido,estado
NOTIF_ENVIO,notificacion_envio,EN,"Hello {{name}}, your shipment {{codigo}} has been scheduled.",activa
RECORDATORIO,recordatorio,EN,"Reminder: Please complete your shipment {{codigo}} by {{fecha}}.",activa
CONFIRMACION,confirmacion,EN,"Your shipment {{codigo}} has been confirmed and is on its way.",activa
```

### Field Notes:
- **codigo**: Unique template identifier
- **idioma**: EN, FR, AR, or SP
- **contenido**: Can include variables like {{name}}, {{codigo}}, {{fecha}}
- **estado**: activa or inactiva

---

## 8. Workflow Configuration (configuracion_workflows)

### Required Columns
```
cliente_id, servicio_postal, dias_recordatorio, dias_escalamiento, dias_verificacion_recepcion, dias_segunda_verificacion, dias_declarar_extravio, tipo_dias
```

### Example CSV:
```csv
cliente_id,servicio_postal,dias_recordatorio,dias_escalamiento,dias_verificacion_recepcion,dias_segunda_verificacion,dias_declarar_extravio,tipo_dias
1,standard,2,5,7,10,15,naturales
1,express,1,3,5,7,10,laborables
2,standard,3,7,10,14,20,naturales
```

### Field Notes:
- **cliente_id**: Must match an existing client ID
- **dias_***: Number of days for each workflow stage
- **tipo_dias**: naturales (calendar days) or laborables (business days)

---

## Common Errors and Solutions

### "Missing columns"
- Ensure your CSV has all required column headers
- Check spelling and capitalization (must match exactly)
- Make sure there are no extra spaces in column names

### "Invalid data"
- Verify date formats are YYYY-MM-DD
- Verify time formats are HH:MM:SS
- Check that enum values match allowed options exactly
- Ensure foreign key IDs exist in related tables

### "Duplicate key"
- Check for duplicate unique values (e.g., telefono, codigo)
- Remove duplicate rows before importing

### "Foreign key constraint"
- Import data in the correct order (see below)
- Verify referenced IDs exist in related tables

---

## Import Order Recommendation

To avoid foreign key constraint errors, import data in this order:

1. **Clients** (clientes)
2. **Nodes** (nodos)
3. **Users** (usuarios)
4. **Panelists** (panelistas) - requires nodes and users
5. **Shipments** (envios) - requires clients, nodes, and panelists
6. **Issues** (incidencias) - requires panelists and optionally shipments
7. **Message Templates** (plantillas_mensajes)
8. **Workflow Configuration** (configuracion_workflows) - requires clients

---

## Best Practices

- **Test with small files first**: Import 2-3 rows to verify format
- **Keep backups**: Save a copy of your original data
- **Check import results**: Review success/error counts after each import
- **Use templates**: Always start with downloaded templates
- **Validate foreign keys**: Ensure referenced IDs exist before importing
- **UTF-8 encoding**: Save files with UTF-8 encoding to support special characters

---

## Need Help?

- Download the template for the exact format
- Review the example data provided
- Check the expected columns list
- Contact your system administrator for assistance
