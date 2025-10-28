-- Insert comprehensive Spanish translations for the entire system
-- Categories: navigation, pages, forms, tables, states, messages, config, dashboard

INSERT INTO public.traducciones (clave, idioma, texto, categoria, descripcion) VALUES
-- Navigation
('nav.dashboard', 'es', 'Panel de Control', 'navigation', 'Menú principal'),
('nav.shipments', 'es', 'Envíos', 'navigation', 'Menú principal'),
('nav.new_shipment', 'es', 'Nuevo Envío', 'navigation', 'Menú principal'),
('nav.panelists', 'es', 'Panelistas', 'navigation', 'Menú principal'),
('nav.nodes', 'es', 'Nodos', 'navigation', 'Menú principal'),
('nav.unassigned_nodes', 'es', 'Nodos Sin Asignar', 'navigation', 'Menú principal'),
('nav.incidents', 'es', 'Incidencias', 'navigation', 'Menú principal'),
('nav.topology', 'es', 'Topología', 'navigation', 'Menú principal'),
('nav.panelist_materials', 'es', 'Plan Materiales Panelistas', 'navigation', 'Menú principal'),
('nav.massive_change', 'es', 'Cambio Masivo Panelista', 'navigation', 'Menú principal'),
('nav.data_import', 'es', 'Importación de Datos', 'navigation', 'Menú principal'),
('nav.configuration', 'es', 'Configuración', 'navigation', 'Menú principal'),
('nav.config.clients', 'es', 'Clientes', 'navigation', 'Submenú configuración'),
('nav.config.regions', 'es', 'Regiones', 'navigation', 'Submenú configuración'),
('nav.config.cities', 'es', 'Ciudades', 'navigation', 'Submenú configuración'),
('nav.config.nodes', 'es', 'Nodos', 'navigation', 'Submenú configuración'),
('nav.config.products', 'es', 'Productos', 'navigation', 'Submenú configuración'),
('nav.config.material_types', 'es', 'Tipos de Material', 'navigation', 'Submenú configuración'),
('nav.config.carriers', 'es', 'Operadores Postales', 'navigation', 'Submenú configuración'),
('nav.config.panelists', 'es', 'Panelistas', 'navigation', 'Submenú configuración'),
('nav.config.shipments', 'es', 'Envíos', 'navigation', 'Submenú configuración'),
('nav.config.incidents', 'es', 'Incidencias', 'navigation', 'Submenú configuración'),
('nav.config.workflows', 'es', 'Workflows', 'navigation', 'Submenú configuración'),
('nav.config.templates', 'es', 'Plantillas de Mensajes', 'navigation', 'Submenú configuración'),
('nav.config.users', 'es', 'Usuarios', 'navigation', 'Submenú configuración'),
('nav.config.languages', 'es', 'Idiomas', 'navigation', 'Submenú configuración'),
('nav.config.translations', 'es', 'Traducciones', 'navigation', 'Submenú configuración'),

-- Dashboard
('dashboard.title', 'es', 'Panel de Control', 'dashboard', 'Título página'),
('dashboard.subtitle', 'es', 'Resumen del sistema de gestión de calidad postal', 'dashboard', 'Subtítulo página'),
('dashboard.total_panelists', 'es', 'Total Panelistas', 'dashboard', 'Estadística'),
('dashboard.active_panelists', 'es', 'Panelistas Activos', 'dashboard', 'Estadística'),
('dashboard.total_shipments', 'es', 'Total Envíos', 'dashboard', 'Estadística'),
('dashboard.pending_shipments', 'es', 'Envíos Pendientes', 'dashboard', 'Estadística'),
('dashboard.received_shipments', 'es', 'Envíos Recibidos', 'dashboard', 'Estadística'),
('dashboard.total_issues', 'es', 'Total Incidencias', 'dashboard', 'Estadística'),
('dashboard.open_issues', 'es', 'Incidencias Abiertas', 'dashboard', 'Estadística'),
('dashboard.allocation_plans', 'es', 'Planes de Asignación por Estado', 'dashboard', 'Sección'),
('dashboard.recent_issues', 'es', 'Incidencias Recientes', 'dashboard', 'Sección'),

-- Common Actions
('action.add', 'es', 'Agregar', 'actions', 'Botón agregar'),
('action.edit', 'es', 'Editar', 'actions', 'Botón editar'),
('action.delete', 'es', 'Eliminar', 'actions', 'Botón eliminar'),
('action.save', 'es', 'Guardar', 'actions', 'Botón guardar'),
('action.cancel', 'es', 'Cancelar', 'actions', 'Botón cancelar'),
('action.search', 'es', 'Buscar', 'actions', 'Acción búsqueda'),
('action.filter', 'es', 'Filtrar', 'actions', 'Acción filtro'),
('action.export', 'es', 'Exportar', 'actions', 'Botón exportar'),
('action.import', 'es', 'Importar', 'actions', 'Botón importar'),
('action.close', 'es', 'Cerrar', 'actions', 'Botón cerrar'),
('action.view', 'es', 'Ver', 'actions', 'Botón ver'),
('action.download', 'es', 'Descargar', 'actions', 'Botón descargar'),
('action.upload', 'es', 'Subir', 'actions', 'Botón subir'),
('action.select', 'es', 'Seleccionar', 'actions', 'Acción seleccionar'),
('action.confirm', 'es', 'Confirmar', 'actions', 'Botón confirmar'),

-- Common Labels
('label.status', 'es', 'Estado', 'labels', 'Label común'),
('label.code', 'es', 'Código', 'labels', 'Label común'),
('label.name', 'es', 'Nombre', 'labels', 'Label común'),
('label.description', 'es', 'Descripción', 'labels', 'Label común'),
('label.date', 'es', 'Fecha', 'labels', 'Label común'),
('label.country', 'es', 'País', 'labels', 'Label común'),
('label.client', 'es', 'Cliente', 'labels', 'Label común'),
('label.region', 'es', 'Región', 'labels', 'Label común'),
('label.city', 'es', 'Ciudad', 'labels', 'Label común'),
('label.address', 'es', 'Dirección', 'labels', 'Label común'),
('label.phone', 'es', 'Teléfono', 'labels', 'Label común'),
('label.email', 'es', 'Correo Electrónico', 'labels', 'Label común'),
('label.notes', 'es', 'Notas', 'labels', 'Label común'),
('label.actions', 'es', 'Acciones', 'labels', 'Label común'),

-- Shipments Page
('shipments.title', 'es', 'Gestión de Envíos', 'shipments', 'Título página'),
('shipments.subtitle', 'es', 'Administra y monitorea todos los envíos del sistema', 'shipments', 'Subtítulo'),
('shipments.new', 'es', 'Nuevo Envío', 'shipments', 'Botón'),
('shipments.origin_node', 'es', 'Nodo Origen', 'shipments', 'Columna tabla'),
('shipments.destination_node', 'es', 'Nodo Destino', 'shipments', 'Columna tabla'),
('shipments.scheduled_date', 'es', 'Fecha Programada', 'shipments', 'Columna tabla'),
('shipments.real_send_date', 'es', 'Fecha Envío Real', 'shipments', 'Columna tabla'),
('shipments.real_reception_date', 'es', 'Fecha Recepción Real', 'shipments', 'Columna tabla'),
('shipments.product', 'es', 'Producto', 'shipments', 'Columna tabla'),
('shipments.carrier', 'es', 'Operador', 'shipments', 'Columna tabla'),
('shipments.tracking_number', 'es', 'Número de Seguimiento', 'shipments', 'Columna tabla'),
('shipments.filter.all', 'es', 'Todos', 'shipments', 'Filtro'),
('shipments.filter.pending', 'es', 'Pendientes', 'shipments', 'Filtro'),
('shipments.filter.sent', 'es', 'Enviados', 'shipments', 'Filtro'),
('shipments.filter.received', 'es', 'Recibidos', 'shipments', 'Filtro'),

-- Shipment Status
('shipment.status.PENDING', 'es', 'Pendiente', 'shipment_status', 'Estado envío'),
('shipment.status.SENT', 'es', 'Enviado', 'shipment_status', 'Estado envío'),
('shipment.status.IN_TRANSIT', 'es', 'En Tránsito', 'shipment_status', 'Estado envío'),
('shipment.status.RECEIVED', 'es', 'Recibido', 'shipment_status', 'Estado envío'),
('shipment.status.DELIVERED', 'es', 'Entregado', 'shipment_status', 'Estado envío'),
('shipment.status.CANCELLED', 'es', 'Cancelado', 'shipment_status', 'Estado envío'),

-- Panelists Page
('panelists.title', 'es', 'Gestión de Panelistas', 'panelists', 'Título página'),
('panelists.subtitle', 'es', 'Administra los panelistas del sistema de calidad postal', 'panelists', 'Subtítulo'),
('panelists.full_name', 'es', 'Nombre Completo', 'panelists', 'Columna tabla'),
('panelists.assigned_node', 'es', 'Nodo Asignado', 'panelists', 'Columna tabla'),
('panelists.language', 'es', 'Idioma', 'panelists', 'Columna tabla'),
('panelists.timezone', 'es', 'Zona Horaria', 'panelists', 'Columna tabla'),
('panelists.preferred_platform', 'es', 'Plataforma Preferida', 'panelists', 'Columna tabla'),
('panelists.communication_schedule', 'es', 'Horario de Comunicación', 'panelists', 'Columna tabla'),

-- Nodes Page
('nodes.title', 'es', 'Gestión de Nodos', 'nodes', 'Título página'),
('nodes.subtitle', 'es', 'Administra los nodos de la red postal', 'nodes', 'Subtítulo'),
('nodes.assigned_panelist', 'es', 'Panelista Asignado', 'nodes', 'Columna tabla'),
('nodes.unassigned', 'es', 'Sin Asignar', 'nodes', 'Estado'),

-- Incidents Page
('incidents.title', 'es', 'Gestión de Incidencias', 'incidents', 'Título página'),
('incidents.subtitle', 'es', 'Monitorea y resuelve incidencias del sistema', 'incidents', 'Subtítulo'),
('incidents.type', 'es', 'Tipo', 'incidents', 'Columna tabla'),
('incidents.priority', 'es', 'Prioridad', 'incidents', 'Columna tabla'),
('incidents.origin', 'es', 'Origen', 'incidents', 'Columna tabla'),
('incidents.creation_date', 'es', 'Fecha Creación', 'incidents', 'Columna tabla'),
('incidents.assigned_manager', 'es', 'Gestor Asignado', 'incidents', 'Columna tabla'),

-- Incident Types
('incident.type.delay', 'es', 'Retraso', 'incident_types', 'Tipo incidencia'),
('incident.type.damage', 'es', 'Daño', 'incident_types', 'Tipo incidencia'),
('incident.type.loss', 'es', 'Pérdida', 'incident_types', 'Tipo incidencia'),
('incident.type.wrong_delivery', 'es', 'Entrega Incorrecta', 'incident_types', 'Tipo incidencia'),
('incident.type.other', 'es', 'Otro', 'incident_types', 'Tipo incidencia'),

-- Incident Status
('incident.status.open', 'es', 'Abierta', 'incident_status', 'Estado incidencia'),
('incident.status.in_progress', 'es', 'En Progreso', 'incident_status', 'Estado incidencia'),
('incident.status.resolved', 'es', 'Resuelta', 'incident_status', 'Estado incidencia'),
('incident.status.closed', 'es', 'Cerrada', 'incident_status', 'Estado incidencia'),

-- Incident Priority
('incident.priority.low', 'es', 'Baja', 'incident_priority', 'Prioridad incidencia'),
('incident.priority.medium', 'es', 'Media', 'incident_priority', 'Prioridad incidencia'),
('incident.priority.high', 'es', 'Alta', 'incident_priority', 'Prioridad incidencia'),
('incident.priority.critical', 'es', 'Crítica', 'incident_priority', 'Prioridad incidencia'),

-- Configuration - Clients
('config.clients.title', 'es', 'Configuración de Clientes', 'config_clients', 'Título página'),
('config.clients.subtitle', 'es', 'Gestiona los clientes del sistema', 'config_clients', 'Subtítulo'),

-- Configuration - Regions
('config.regions.title', 'es', 'Configuración de Regiones', 'config_regions', 'Título página'),
('config.regions.subtitle', 'es', 'Gestiona las regiones geográficas', 'config_regions', 'Subtítulo'),

-- Configuration - Cities
('config.cities.title', 'es', 'Configuración de Ciudades', 'config_cities', 'Título página'),
('config.cities.subtitle', 'es', 'Gestiona las ciudades del sistema', 'config_cities', 'Subtítulo'),
('config.cities.classification', 'es', 'Clasificación', 'config_cities', 'Campo'),
('config.cities.postal_code', 'es', 'Código Postal Principal', 'config_cities', 'Campo'),
('config.cities.population', 'es', 'Volumen Poblacional', 'config_cities', 'Campo'),
('config.cities.postal_traffic', 'es', 'Volumen Tráfico Postal', 'config_cities', 'Campo'),

-- Configuration - Products
('config.products.title', 'es', 'Configuración de Productos', 'config_products', 'Título página'),
('config.products.subtitle', 'es', 'Gestiona los productos postales', 'config_products', 'Subtítulo'),
('config.products.product_name', 'es', 'Nombre del Producto', 'config_products', 'Campo'),
('config.products.product_code', 'es', 'Código del Producto', 'config_products', 'Campo'),
('config.products.delivery_hours', 'es', 'Horas de Entrega Estándar', 'config_products', 'Campo'),

-- Configuration - Material Types
('config.materials.title', 'es', 'Tipos de Material', 'config_materials', 'Título página'),
('config.materials.subtitle', 'es', 'Gestiona los tipos de material postal', 'config_materials', 'Subtítulo'),
('config.materials.unit', 'es', 'Unidad de Medida', 'config_materials', 'Campo'),

-- Configuration - Carriers
('config.carriers.title', 'es', 'Operadores Postales', 'config_carriers', 'Título página'),
('config.carriers.subtitle', 'es', 'Gestiona los operadores postales autorizados', 'config_carriers', 'Subtítulo'),
('config.carriers.legal_name', 'es', 'Nombre Legal', 'config_carriers', 'Campo'),
('config.carriers.commercial_name', 'es', 'Nombre Comercial', 'config_carriers', 'Campo'),
('config.carriers.tax_id', 'es', 'Identificación Fiscal', 'config_carriers', 'Campo'),
('config.carriers.license_number', 'es', 'Número de Licencia', 'config_carriers', 'Campo'),
('config.carriers.operator_type', 'es', 'Tipo de Operador', 'config_carriers', 'Campo'),
('config.carriers.regulatory_status', 'es', 'Estado Regulatorio', 'config_carriers', 'Campo'),

-- Configuration - Workflows
('config.workflows.title', 'es', 'Configuración de Workflows', 'config_workflows', 'Título página'),
('config.workflows.subtitle', 'es', 'Define los workflows de comunicación', 'config_workflows', 'Subtítulo'),
('config.workflows.sender_reminder_1', 'es', 'Primera Notificación Remitente (horas)', 'config_workflows', 'Campo'),
('config.workflows.sender_reminder_2', 'es', 'Segunda Notificación Remitente (horas)', 'config_workflows', 'Campo'),
('config.workflows.sender_escalation', 'es', 'Escalamiento Remitente (horas)', 'config_workflows', 'Campo'),
('config.workflows.receiver_verification', 'es', 'Verificación Destinatario (horas)', 'config_workflows', 'Campo'),
('config.workflows.receiver_escalation', 'es', 'Escalamiento Destinatario (horas)', 'config_workflows', 'Campo'),

-- Configuration - Templates
('config.templates.title', 'es', 'Plantillas de Mensajes', 'config_templates', 'Título página'),
('config.templates.subtitle', 'es', 'Gestiona las plantillas de comunicación', 'config_templates', 'Subtítulo'),
('config.templates.type', 'es', 'Tipo de Plantilla', 'config_templates', 'Campo'),
('config.templates.content', 'es', 'Contenido', 'config_templates', 'Campo'),
('config.templates.variables', 'es', 'Variables', 'config_templates', 'Campo'),

-- Configuration - Users
('config.users.title', 'es', 'Gestión de Usuarios', 'config_users', 'Título página'),
('config.users.subtitle', 'es', 'Administra los usuarios del sistema', 'config_users', 'Subtítulo'),
('config.users.role', 'es', 'Rol', 'config_users', 'Campo'),
('config.users.last_access', 'es', 'Último Acceso', 'config_users', 'Campo'),

-- Configuration - Languages
('config.languages.title', 'es', 'Idiomas Disponibles', 'config_languages', 'Título página'),
('config.languages.subtitle', 'es', 'Gestiona los idiomas del sistema', 'config_languages', 'Subtítulo'),
('config.languages.code', 'es', 'Código', 'config_languages', 'Campo'),
('config.languages.native_name', 'es', 'Nombre Nativo', 'config_languages', 'Campo'),
('config.languages.english_name', 'es', 'Nombre en Inglés', 'config_languages', 'Campo'),
('config.languages.flag', 'es', 'Bandera', 'config_languages', 'Campo'),
('config.languages.is_default', 'es', 'Por Defecto', 'config_languages', 'Campo'),
('config.languages.active', 'es', 'Activo', 'config_languages', 'Campo'),

-- Configuration - Translations
('config.translations.title', 'es', 'Gestión de Traducciones', 'config_translations', 'Título página'),
('config.translations.subtitle', 'es', 'Administra las traducciones del sistema', 'config_translations', 'Subtítulo'),
('config.translations.key', 'es', 'Clave', 'config_translations', 'Campo'),
('config.translations.category', 'es', 'Categoría', 'config_translations', 'Campo'),
('config.translations.add_new', 'es', 'Agregar Nueva Traducción', 'config_translations', 'Botón'),
('config.translations.export_csv', 'es', 'Exportar CSV', 'config_translations', 'Botón'),
('config.translations.import_csv', 'es', 'Importar CSV', 'config_translations', 'Botón'),
('config.translations.filter_category', 'es', 'Filtrar por categoría', 'config_translations', 'Placeholder'),
('config.translations.search_key', 'es', 'Buscar por clave...', 'config_translations', 'Placeholder'),
('config.translations.all_categories', 'es', 'Todas las categorías', 'config_translations', 'Opción filtro'),
('config.translations.enter_key', 'es', 'Ingrese la clave de traducción', 'config_translations', 'Placeholder'),
('config.translations.enter_description', 'es', 'Descripción (opcional)', 'config_translations', 'Placeholder'),

-- Messages
('message.success.saved', 'es', 'Guardado exitosamente', 'messages', 'Mensaje éxito'),
('message.success.deleted', 'es', 'Eliminado exitosamente', 'messages', 'Mensaje éxito'),
('message.success.updated', 'es', 'Actualizado exitosamente', 'messages', 'Mensaje éxito'),
('message.error.save', 'es', 'Error al guardar', 'messages', 'Mensaje error'),
('message.error.delete', 'es', 'Error al eliminar', 'messages', 'Mensaje error'),
('message.error.load', 'es', 'Error al cargar datos', 'messages', 'Mensaje error'),
('message.confirm.delete', 'es', '¿Está seguro de eliminar este registro?', 'messages', 'Confirmación'),

-- Status Values
('status.active', 'es', 'Activo', 'status', 'Estado general'),
('status.inactive', 'es', 'Inactivo', 'status', 'Estado general'),
('status.enabled', 'es', 'Habilitado', 'status', 'Estado general'),
('status.disabled', 'es', 'Deshabilitado', 'status', 'Estado general'),

-- Day Types
('days.calendar', 'es', 'Días Calendario', 'day_types', 'Tipo de días'),
('days.business', 'es', 'Días Hábiles', 'day_types', 'Tipo de días'),
('days.both', 'es', 'Ambos', 'day_types', 'Tipo de días'),

-- Import/Export
('import.title', 'es', 'Importación de Datos', 'import', 'Título'),
('import.success', 'es', 'Datos importados exitosamente', 'import', 'Mensaje éxito'),
('import.error', 'es', 'Error al importar datos', 'import', 'Mensaje error'),
('export.success', 'es', 'Datos exportados exitosamente', 'export', 'Mensaje éxito'),
('export.error', 'es', 'Error al exportar datos', 'export', 'Mensaje error')

ON CONFLICT (clave, idioma) 
DO UPDATE SET 
  texto = EXCLUDED.texto,
  categoria = EXCLUDED.categoria,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = NOW();