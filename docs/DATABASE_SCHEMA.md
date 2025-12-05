# Database Schema Documentation

**Generated:** 2025-12-05  
**Database:** one_panelist (Supabase)  
**Project ID:** rpasddacpejcjgyiyrsx

## Overview

This document describes the complete structure of all tables in the database. Use this as reference when developing new features to avoid type mismatches.

---

## Global Tables (Superadmin Only)

### idiomas_disponibles

Available languages in the system.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| codigo | string | ISO language code (e.g., 'es', 'en') |
| nombre_nativo | string | Native name (e.g., 'Español') |
| nombre_ingles | string | English name (e.g., 'Spanish') |
| bandera_emoji | string | Flag emoji (e.g., '🇪🇸') |
| es_default | boolean | Is this the default language? |
| activo | boolean | Is this language active? |
| fecha_creacion | string | Creation timestamp (ISO 8601) |

**RLS Policies:**
- Superadmin can view all languages
- Authenticated users can view active languages only

---

### traducciones

System-wide translations.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| clave | string | Translation key (e.g., 'auth.welcome') |
| idioma | string | Language code |
| texto | string | Translated text |
| categoria | string \| null | Category for grouping |
| descripcion | string \| null | Description/notes |
| fecha_creacion | string | Creation timestamp |
| fecha_modificacion | string | Last modification timestamp |

**RLS Policies:**
- All authenticated users can read
- Only superadmin can insert/update/delete

---

### clientes

Client accounts in the system.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| codigo | string | Client code (e.g., '0001') |
| nombre | string | Client name |
| activo | boolean | Is client active? |
| configuracion | any | JSON configuration |
| fecha_creacion | string | Creation timestamp |
| fecha_modificacion | string | Last modification timestamp |

**RLS Policies:**
- Only superadmin can view/manage all clients
- Regular users see only their assigned client

---

## User Management

### usuarios

User accounts.

| Column | Type | Description |
|--------|------|-------------|
| id | string | Primary key (UUID from auth.users) |
| email | string | User email |
| nombre_completo | string | Full name |
| cliente_id | number | Associated client |
| activo | boolean | Is user active? |
| idioma_preferido | string | Preferred language code |
| timezone | string | User timezone |
| avatar_url | string \| null | Profile picture URL |
| telefono | string \| null | Phone number |
| cargo | string \| null | Job title |
| fecha_creacion | string | Creation timestamp |
| fecha_modificacion | string | Last modification timestamp |

---

### user_roles

User role assignments.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| user_id | string | User UUID |
| role | string | Role name ('superadmin', 'admin', 'user') |
| cliente_id | number \| null | Client scope (null for superadmin) |

---

## Topology

### regiones

Geographic regions.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| codigo | string | Region code |
| nombre | string | Region name |
| pais | string | Country |
| activo | boolean | Is active? |
| latitud | number \| null | Latitude |
| longitud | number \| null | Longitude |
| fecha_creacion | string | Creation timestamp |

---

### ciudades

Cities within regions.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| region_id | number | Parent region |
| codigo | string | City code |
| nombre | string | City name |
| poblacion | number \| null | Population |
| area_km2 | number \| null | Area in km² |
| latitud | number \| null | Latitude |
| longitud | number \| null | Longitude |
| zona_horaria | string \| null | Timezone |
| activo | boolean | Is active? |
| es_capital | boolean | Is capital city? |
| altitud_metros | number \| null | Altitude in meters |
| codigo_postal | string \| null | Postal code |
| prefijo_telefonico | string \| null | Phone prefix |
| idioma_principal | string \| null | Main language |
| fecha_creacion | string | Creation timestamp |

---

### nodos

Distribution nodes.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| ciudad_id | number | Associated city |
| codigo | string | Node code |
| nombre | string | Node name |
| tipo | string | Node type |
| activo | boolean | Is active? |
| fecha_creacion | string | Creation timestamp |

---

## Panelists

### panelistas

Panel members who receive shipments.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| nodo_id | number | Associated node |
| codigo | string | Panelist code |
| nombre | string | Full name |
| email | string | Email address |
| telefono | string \| null | Phone number |
| direccion | string \| null | Address |
| ciudad_id | number | City |
| codigo_postal | string \| null | Postal code |
| latitud | number \| null | Latitude |
| longitud | number \| null | Longitude |
| activo | boolean | Is active? |
| fecha_registro | string | Registration date |
| fecha_ultima_actividad | string \| null | Last activity |
| preferencias | any | JSON preferences |
| notas | string \| null | Notes |
| nivel_engagement | string \| null | Engagement level |
| productos_preferidos | any | Preferred products (JSON array) |
| restricciones_dieteticas | any | Dietary restrictions (JSON array) |
| frecuencia_deseada | string \| null | Desired frequency |
| tamano_hogar | number \| null | Household size |
| rango_edad | string \| null | Age range |
| genero | string \| null | Gender |
| fecha_creacion | string | Creation timestamp |

---

## Carriers & Products

### carriers

Shipping carriers.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| codigo | string | Carrier code |
| nombre | string | Carrier name |
| tipo | string | Carrier type |
| activo | boolean | Is active? |
| capacidad_diaria | number \| null | Daily capacity |
| capacidad_semanal | number \| null | Weekly capacity |
| capacidad_mensual | number \| null | Monthly capacity |
| costo_base | number \| null | Base cost |
| costo_por_km | number \| null | Cost per km |
| costo_por_paquete | number \| null | Cost per package |
| tiempo_preparacion_horas | number \| null | Preparation time (hours) |
| horario_inicio | string \| null | Start time |
| horario_fin | string \| null | End time |
| dias_operacion | any | Operating days (JSON array) |
| cobertura_ciudades | any | Coverage cities (JSON array) |
| restricciones | any | Restrictions (JSON) |
| contacto_nombre | string \| null | Contact name |
| contacto_email | string \| null | Contact email |
| contacto_telefono | string \| null | Contact phone |
| notas | string \| null | Notes |
| calificacion | number \| null | Rating |
| fecha_inicio_contrato | string \| null | Contract start date |
| fecha_fin_contrato | string \| null | Contract end date |
| fecha_creacion | string | Creation timestamp |
| fecha_modificacion | string | Last modification |

---

### carrier_productos

Products that carriers can handle.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| carrier_id | number | Carrier |
| producto_id | number | Product |
| activo | boolean | Is active? |

---

### tipos_material

Material types for products.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| codigo | string | Material code |
| nombre | string | Material name |
| unidad_medida | string | Unit of measure |
| costo_unitario | number \| null | Unit cost |
| activo | boolean | Is active? |
| descripcion | string \| null | Description |
| fecha_creacion | string | Creation timestamp |

---

### productos_cliente

Client products.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| codigo | string | Product code |
| nombre | string | Product name |
| descripcion | string \| null | Description |
| categoria | string \| null | Category |
| activo | boolean | Is active? |
| peso_gramos | number \| null | Weight in grams |
| fecha_creacion | string | Creation timestamp |

---

### producto_materiales

Materials required for each product.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| producto_id | number | Product |
| tipo_material_id | number | Material type |
| cantidad | number | Quantity required |
| unidad | string | Unit |
| es_opcional | boolean | Is optional? |
| fecha_creacion | string | Creation timestamp |

---

## Shipments

### envios

Shipment records.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| panelista_id | number | Panelist |
| producto_id | number | Product |
| carrier_id | number \| null | Carrier |
| nodo_origen_id | number | Origin node |
| estado | string | Status |
| fecha_programada | string \| null | Scheduled date |
| fecha_envio | string \| null | Shipment date |
| fecha_entrega | string \| null | Delivery date |
| fecha_confirmacion | string \| null | Confirmation date |
| tracking_number | string \| null | Tracking number |
| costo_envio | number \| null | Shipping cost |
| peso_gramos | number \| null | Weight in grams |
| dimensiones | any | Dimensions (JSON) |
| notas | string \| null | Notes |
| metadata | any | Additional metadata (JSON) |
| codigo_qr | string \| null | QR code |
| prioridad | string \| null | Priority |
| fecha_creacion | string | Creation timestamp |
| fecha_modificacion | string | Last modification |
| created_by | string \| null | Created by user |

---

## Incidents

### incidencias

Shipment incidents (table is empty).

### historial_incidencias

Incident history (table is empty).

---

## Workflows & Configuration

### configuracion_workflows

Workflow configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| nombre | string | Workflow name |
| tipo | string | Workflow type |
| configuracion | any | Configuration (JSON) |
| activo | boolean | Is active? |
| descripcion | string \| null | Description |
| orden | number \| null | Display order |
| condiciones | any | Conditions (JSON) |
| acciones | any | Actions (JSON) |
| fecha_creacion | string | Creation timestamp |

---

## Allocation Planning

### ciudad_transit_times

Transit times between cities.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| ciudad_origen_id | number | Origin city |
| ciudad_destino_id | number | Destination city |
| carrier_id | number \| null | Carrier |
| tiempo_transito_horas | number | Transit time (hours) |
| distancia_km | number \| null | Distance in km |
| costo | number \| null | Cost |
| activo | boolean | Is active? |
| notas | string \| null | Notes |
| fecha_creacion | string | Creation timestamp |

---

### generated_allocation_plans

Generated allocation plans.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| nombre | string | Plan name |
| periodo_inicio | string | Start period |
| periodo_fin | string | End period |
| estado | string | Status |
| total_envios | number \| null | Total shipments |
| total_panelistas | number \| null | Total panelists |
| total_productos | number \| null | Total products |
| costo_total | number \| null | Total cost |
| parametros | any | Parameters (JSON) |
| resultados | any | Results (JSON) |
| metricas | any | Metrics (JSON) |
| fecha_generacion | string | Generation date |
| generado_por | string \| null | Generated by user |
| aprobado_por | string \| null | Approved by user |
| fecha_aprobacion | string \| null | Approval date |
| notas | string \| null | Notes |
| fecha_creacion | string | Creation timestamp |
| fecha_modificacion | string | Last modification |

---

### generated_allocation_plan_details

Details of allocation plans.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| plan_id | number | Parent plan |
| panelista_id | number | Panelist |
| producto_id | number | Product |
| nodo_id | number | Node |
| carrier_id | number \| null | Carrier |
| fecha_programada | string | Scheduled date |
| cantidad | number | Quantity |
| costo_estimado | number \| null | Estimated cost |
| prioridad | number \| null | Priority |
| metadata | any | Additional metadata (JSON) |
| fecha_creacion | string | Creation timestamp |

---

### city_allocation_requirements

City allocation requirements (table is empty).

### product_seasonality

Product seasonality data (table is empty).

### scheduled_leaves

Scheduled leaves/holidays.

| Column | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| cliente_id | number | Associated client |
| entidad_tipo | string | Entity type ('panelista', 'carrier', etc.) |
| entidad_id | number | Entity ID |
| fecha_inicio | string | Start date |
| fecha_fin | string | End date |
| motivo | string \| null | Reason |
| aprobado | boolean | Is approved? |
| aprobado_por | string \| null | Approved by user |
| notas | string \| null | Notes |
| fecha_creacion | string | Creation timestamp |
| fecha_modificacion | string | Last modification |

---

## Administration

### plantillas_mensajes

Message templates (table is empty).

### menu_permissions

Menu permissions (table is empty).

### admin_audit_log

Admin audit log (table is empty).

---

## Notes

- All tables with `cliente_id` are scoped per client
- Tables without `cliente_id` are global (superadmin only)
- All timestamps are in ISO 8601 format
- JSON columns use PostgreSQL JSONB type
- RLS policies enforce data segregation by client

---

## Updating This Documentation

To regenerate this documentation:

```bash
cd /home/ubuntu
node extract_all_tables.js
node generate_types.js
```

This will:
1. Extract current schema from Supabase
2. Generate TypeScript types
3. Update this documentation
