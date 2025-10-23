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

## 1. Clients (clientes)

### Required Columns
```
nombre, codigo, pais, estado
```

### Example CSV:
```csv
nombre,codigo,pais,estado
Acme Corporation,ACME,USA,activo
Global Logistics Inc,GLOB,Canada,activo
Euro Post Services,EURO,France,activo
Spanish Postal Services,POST,España,activo
```

### Field Notes:
- **codigo**: Unique client identifier (3-5 characters recommended)
- **estado**: activo or inactivo

---

## 2. Regions (regiones)

### Required Columns
```
cliente_id, codigo, nombre, pais, descripcion, estado
```

### Example CSV:
```csv
cliente_id,codigo,nombre,pais,descripcion,estado
1,MAD,Madrid Region,España,Metropolitan area of Madrid,activo
1,CAT,Catalonia Region,España,Autonomous community in northeast Spain,activo
2,IDF,Île-de-France,France,Region surrounding Paris,activo
```

### Field Notes:
- **cliente_id**: Must match an existing client ID
- **codigo**: Unique region code (3-4 characters recommended)
- **pais**: Country name
- **estado**: activo or inactivo

---

## 3. Cities (ciudades)

### Required Columns
```
cliente_id, region_id, codigo, nombre, codigo_postal_principal, pais, clasificacion, criterio_clasificacion, descripcion, latitud, longitud, volumen_poblacional, volumen_trafico_postal, estado
```

### Example CSV:
```csv
cliente_id,region_id,codigo,nombre,codigo_postal_principal,pais,clasificacion,criterio_clasificacion,descripcion,latitud,longitud,volumen_poblacional,volumen_trafico_postal,estado
1,1,MAD01,Madrid Centro,28001,España,A,Metropolitan center,Downtown Madrid area,40.4168,-3.7038,3200000,500000,activo
1,2,BCN01,Barcelona Centro,08001,España,A,Metropolitan center,Downtown Barcelona area,41.3851,2.1734,1600000,300000,activo
2,3,PAR01,Paris Centre,75001,France,A,Metropolitan center,Central Paris,48.8566,2.3522,2200000,450000,activo
```

### Field Notes:
- **cliente_id**: Must match an existing client ID
- **region_id**: Must match an existing region ID
- **codigo**: Unique city code (5-6 characters recommended)
- **clasificacion**: Classification level (A, B, C, etc.)
- **criterio_clasificacion**: Classification criteria description
- **latitud/longitud**: Geographic coordinates (decimal format)
- **volumen_poblacional**: Population volume (integer)
- **volumen_trafico_postal**: Postal traffic volume (integer)
- **estado**: activo or inactivo

---

## 4. Nodes (nodos)

### Required Columns
```
region_id, ciudad_id, panelista_id, ciudad, pais, estado
```

### Example CSV:
```csv
region_id,ciudad_id,panelista_id,ciudad,pais,estado
1,1,,Madrid,España,activo
2,2,1,Barcelona,España,activo
3,3,2,Paris,France,activo
```

### Field Notes:
- **region_id**: Must match an existing region ID
- **ciudad_id**: Must match an existing city ID
- **panelista_id**: Optional - ID of assigned panelist (leave empty if none)
- **ciudad**: City name (text, must match city in ciudad_id)
- **pais**: Country name
- **estado**: activo or inactivo
- **Note**: The node code (codigo) is auto-generated based on client-region-city-sequence

---

## 5. Users (usuarios)

### Required Columns
```
nombre_completo, email, password_hash, rol, telefono, estado
```

### Example CSV:
```csv
nombre_completo,email,password_hash,rol,telefono,estado
Admin User,admin@example.com,$2a$10$example_hash,administrador,+12125551234,activo
Manager User,manager@example.com,$2a$10$example_hash,gestor,+13105559876,activo
Coordinator User,coordinator@example.com,$2a$10$example_hash,coordinador,+34600123456,activo
```

### Field Notes:
- **telefono**: International format required: +[country code][number] (e.g., +34600123456, +12125551234)
- **password_hash**: Must be a bcrypt-hashed password (use a tool to generate)
- **rol**: gestor, coordinador, or administrador
- **estado**: activo or inactivo
- **Important**: Never store plain text passwords!

---

## 6. Panelists (panelistas)

### Required Columns
```
nombre_completo, email, telefono, direccion_calle, direccion_ciudad, direccion_codigo_postal, direccion_pais, nodo_asignado, idioma, zona_horaria, horario_inicio, horario_fin, plataforma_preferida, dias_comunicacion, gestor_asignado_id, estado
```

### Example CSV:
```csv
nombre_completo,email,telefono,direccion_calle,direccion_ciudad,direccion_codigo_postal,direccion_pais,nodo_asignado,idioma,zona_horaria,horario_inicio,horario_fin,plataforma_preferida,dias_comunicacion,gestor_asignado_id,estado
John Smith,john@example.com,+12125551234,123 Main St,New York,10001,USA,NYC001,en,America/New_York,09:00:00,17:00:00,whatsapp,ambos,1,activo
María García,maria@example.com,+34600123456,Calle Mayor 5,Madrid,28001,España,MAD001,es,Europe/Madrid,09:00:00,18:00:00,telegram,dias_laborables,2,activo
Jean Dupont,jean@example.com,+33612345678,Rue de Rivoli 10,Paris,75001,France,PAR001,fr,Europe/Paris,08:00:00,16:00:00,whatsapp,fines_semana,1,activo
```

### Field Notes:
- **telefono**: International format required: +[country code][number] (e.g., +34600123456, +12125551234)
- **idioma**: Must be es, en, pt, fr, or ar (ISO 639-1 codes)
- **zona_horaria**: Use IANA timezone names (e.g., America/New_York, Europe/Madrid)
- **horario_inicio/horario_fin**: 24-hour format HH:MM:SS
- **plataforma_preferida**: Must be whatsapp, telegram, or email
- **dias_comunicacion**: Must be dias_laborables, fines_semana, or ambos
- **gestor_asignado_id**: Optional - ID of assigned manager (leave empty if none)
- **estado**: activo, inactivo, or suspendido
- **nodo_asignado**: Optional - Node code if assigned to a specific node

---

## 7. Shipments (envios)

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

## 8. Issues (incidencias)

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

## 9. Message Templates (plantillas_mensajes)

### Required Columns
```
codigo, tipo, idioma, contenido, estado
```

### Example CSV:
```csv
codigo,tipo,idioma,contenido,estado
NOTIF_ENVIO,notificacion_envio,en,"Hello {{name}}, your shipment {{codigo}} has been scheduled.",activa
RECORDATORIO,recordatorio,en,"Reminder: Please complete your shipment {{codigo}} by {{fecha}}.",activa
CONFIRMACION,confirmacion,en,"Your shipment {{codigo}} has been confirmed and is on its way.",activa
```

### Field Notes:
- **codigo**: Unique template identifier
- **idioma**: es, en, pt, fr, or ar
- **contenido**: Can include variables like {{name}}, {{codigo}}, {{fecha}}
- **estado**: activa or inactiva

---

## 10. Workflow Configuration (configuracion_workflows)

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
2. **Regions** (regiones) - requires clients
3. **Cities** (ciudades) - requires clients and regions
4. **Users** (usuarios)
5. **Panelists** (panelistas) - requires users (for gestor_asignado_id)
6. **Nodes** (nodos) - requires regions, cities, and optionally panelists
7. **Shipments** (envios) - requires clients, nodes, and panelists
8. **Issues** (incidencias) - requires panelists and optionally shipments
9. **Message Templates** (plantillas_mensajes)
10. **Workflow Configuration** (configuracion_workflows) - requires clients

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
