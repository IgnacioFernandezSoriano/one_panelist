import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function Documentation() {
  const [activeTab, setActiveTab] = useState("technical");

  const exportToMarkdown = () => {
    const content = generateMarkdownContent();
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documentacion-sistema-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Documentación exportada correctamente");
  };

  const exportToHTML = () => {
    const content = generateHTMLContent();
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documentacion-sistema-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Documentación exportada correctamente");
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Documentación del Sistema</h1>
            <p className="text-muted-foreground mt-2">
              Documentación técnica y manual de usuario
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToMarkdown} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar Markdown
            </Button>
            <Button onClick={exportToHTML}>
              <Download className="w-4 h-4 mr-2" />
              Exportar HTML
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="technical">
              <FileText className="w-4 h-4 mr-2" />
              Documentación Técnica
            </TabsTrigger>
            <TabsTrigger value="user">
              <BookOpen className="w-4 h-4 mr-2" />
              Manual de Usuario
            </TabsTrigger>
          </TabsList>

          <TabsContent value="technical" className="space-y-6">
            <TechnicalDocumentation />
          </TabsContent>

          <TabsContent value="user" className="space-y-6">
            <UserDocumentation />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function TechnicalDocumentation() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>1. Arquitectura del Sistema</CardTitle>
          <CardDescription>Visión general de la arquitectura</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>Stack Tecnológico</h3>
          <ul>
            <li><strong>Frontend:</strong> React 18 + TypeScript</li>
            <li><strong>UI Framework:</strong> Tailwind CSS + shadcn/ui</li>
            <li><strong>Estado y Datos:</strong> TanStack Query (React Query)</li>
            <li><strong>Routing:</strong> React Router v6</li>
            <li><strong>Backend:</strong> Supabase (PostgreSQL + Auth + Storage)</li>
            <li><strong>Build Tool:</strong> Vite</li>
          </ul>

          <h3>Características Principales</h3>
          <ul>
            <li>Sistema multi-cliente con aislamiento de datos</li>
            <li>Autenticación y autorización basada en roles</li>
            <li>Gestión de envíos postales y panelistas</li>
            <li>Generador inteligente de planes de asignación</li>
            <li>Sistema de incidencias y seguimiento</li>
            <li>Importación masiva de datos vía CSV</li>
            <li>Soporte multi-idioma</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Base de Datos</CardTitle>
          <CardDescription>Estructura y modelos de datos</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>Entidades Principales</h3>
          
          <h4>Clientes</h4>
          <p>Tabla raíz que representa organizaciones. Todos los datos están aislados por cliente.</p>
          <ul>
            <li><code>id</code>: Identificador único</li>
            <li><code>codigo</code>: Código único de 4 dígitos</li>
            <li><code>nombre</code>: Nombre del cliente</li>
            <li><code>pais</code>: País del cliente</li>
            <li><code>max_events_per_panelist_week</code>: Límite de eventos por semana</li>
          </ul>

          <h4>Usuarios</h4>
          <p>Gestión de usuarios del sistema con roles asignados.</p>
          <ul>
            <li><code>id</code>: Identificador único</li>
            <li><code>email</code>: Email único</li>
            <li><code>nombre_completo</code>: Nombre completo</li>
            <li><code>cliente_id</code>: Referencia al cliente</li>
            <li><code>idioma_preferido</code>: Idioma de la interfaz</li>
          </ul>

          <h4>Roles y Permisos</h4>
          <p>Sistema de roles jerárquico:</p>
          <ul>
            <li><strong>superadmin:</strong> Acceso total al sistema, gestión de clientes</li>
            <li><strong>admin:</strong> Gestión completa dentro de su cliente</li>
            <li><strong>coordinator:</strong> Coordinación de envíos y panelistas</li>
            <li><strong>manager:</strong> Gestión operativa</li>
          </ul>

          <h4>Regiones y Ciudades</h4>
          <p>Jerarquía geográfica para organizar nodos.</p>
          <ul>
            <li><code>regiones</code>: Áreas geográficas amplias</li>
            <li><code>ciudades</code>: Ciudades con clasificación (A, B, C)</li>
            <li>Criterios de clasificación basados en volumen poblacional y tráfico postal</li>
          </ul>

          <h4>Nodos</h4>
          <p>Puntos de envío/recepción asociados a ciudades y panelistas.</p>
          <ul>
            <li><code>codigo</code>: Código único del nodo</li>
            <li><code>ciudad_id</code>: Referencia a ciudad</li>
            <li><code>panelista_id</code>: Panelista asignado (opcional)</li>
            <li><code>estado</code>: activo/inactivo</li>
          </ul>

          <h4>Panelistas</h4>
          <p>Personas que participan en el envío/recepción de productos.</p>
          <ul>
            <li><code>nombre_completo</code>: Nombre del panelista</li>
            <li><code>nodo_asignado</code>: Nodo donde opera</li>
            <li><code>direccion_*</code>: Datos de dirección completa</li>
            <li><code>horario_inicio/fin</code>: Disponibilidad</li>
            <li><code>dias_comunicacion</code>: Preferencia de días</li>
            <li><code>idioma</code>: Idioma de comunicación</li>
            <li><code>gestor_asignado_id</code>: Usuario responsable</li>
          </ul>

          <h4>Productos</h4>
          <p>Tipos de productos que se envían.</p>
          <ul>
            <li><code>codigo_producto</code>: Código único</li>
            <li><code>nombre_producto</code>: Nombre descriptivo</li>
            <li><code>standard_delivery_hours</code>: Tiempo estándar de entrega</li>
            <li><code>cliente_id</code>: Cliente propietario</li>
          </ul>

          <h4>Tipos de Material</h4>
          <p>Materiales necesarios para los envíos.</p>
          <ul>
            <li><code>codigo</code>: Código único</li>
            <li><code>nombre</code>: Nombre del material</li>
            <li><code>unidad_medida</code>: Unidad (unidad, kg, m, etc.)</li>
          </ul>

          <h4>Producto-Materiales</h4>
          <p>Relación entre productos y los materiales que requieren.</p>
          <ul>
            <li><code>producto_id</code>: Producto</li>
            <li><code>tipo_material_id</code>: Material</li>
            <li><code>cantidad</code>: Cantidad requerida</li>
            <li><code>es_obligatorio</code>: Si es obligatorio</li>
          </ul>

          <h4>Carriers</h4>
          <p>Operadores logísticos que realizan los envíos.</p>
          <ul>
            <li><code>carrier_code</code>: Código único</li>
            <li><code>legal_name/commercial_name</code>: Nombres del carrier</li>
            <li><code>operator_type</code>: Tipo de operador</li>
            <li><code>regulatory_status</code>: Estado regulatorio</li>
            <li><code>geographic_scope</code>: Alcance geográfico</li>
          </ul>

          <h4>Carrier-Productos</h4>
          <p>Productos que cada carrier puede transportar.</p>

          <h4>Envíos</h4>
          <p>Registros de envíos programados y realizados.</p>
          <ul>
            <li><code>nodo_origen/destino</code>: Nodos de envío</li>
            <li><code>panelista_origen_id/destino_id</code>: Panelistas involucrados</li>
            <li><code>producto_id</code>: Producto enviado</li>
            <li><code>carrier_id</code>: Carrier asignado</li>
            <li><code>fecha_programada</code>: Fecha planificada</li>
            <li><code>fecha_envio_real/recepcion_real</code>: Fechas reales</li>
            <li><code>estado</code>: PENDING, SENDER_NOTIFIED, SENT, RECEIVED, etc.</li>
            <li><code>motivo_creacion</code>: manual, csv_import, plan_generation</li>
          </ul>

          <h4>Incidencias</h4>
          <p>Seguimiento de problemas y resoluciones.</p>
          <ul>
            <li><code>tipo</code>: Tipo de incidencia</li>
            <li><code>prioridad</code>: alta, media, baja</li>
            <li><code>estado</code>: abierta, en_proceso, resuelta, cerrada</li>
            <li><code>panelista_id</code>: Panelista afectado</li>
            <li><code>envio_id</code>: Envío relacionado (opcional)</li>
            <li><code>gestor_asignado_id</code>: Usuario responsable</li>
          </ul>

          <h4>Planes de Asignación Generados</h4>
          <p>Planes inteligentes generados por el algoritmo.</p>
          <ul>
            <li><code>generated_allocation_plans</code>: Plan maestro</li>
            <li><code>generated_allocation_plan_details</code>: Detalles de envíos</li>
            <li><code>status</code>: draft, merged</li>
            <li><code>merge_strategy</code>: add, replace</li>
          </ul>

          <h4>Product Seasonality</h4>
          <p>Estacionalidad por producto y mes.</p>
          <ul>
            <li>Porcentajes mensuales que suman 100%</li>
            <li>Permite distribución no uniforme de envíos</li>
          </ul>

          <h4>City Allocation Requirements</h4>
          <p>Requerimientos de asignación por ciudad.</p>
          <ul>
            <li>Porcentajes de asignación desde ciudades A, B, C</li>
          </ul>

          <h4>Classification Allocation Matrix</h4>
          <p>Matriz de distribución por clasificación destino.</p>
          <ul>
            <li>Define cómo distribuir envíos entre clasificaciones</li>
          </ul>

          <h4>Workflows</h4>
          <p>Configuración de recordatorios y escalaciones.</p>
          <ul>
            <li>Tiempos de recordatorio para remitente y destinatario</li>
            <li>Escalaciones automáticas</li>
            <li>Tipo de días (calendario o hábiles)</li>
          </ul>

          <h4>Plantillas de Mensajes</h4>
          <p>Plantillas multiidioma para notificaciones.</p>
          <ul>
            <li><code>tipo</code>: Tipo de mensaje</li>
            <li><code>idioma</code>: Código de idioma</li>
            <li><code>contenido</code>: Texto con variables</li>
            <li><code>variables</code>: Variables disponibles (JSON)</li>
          </ul>

          <h3>Row Level Security (RLS)</h3>
          <p>Todas las tablas tienen políticas RLS que garantizan:</p>
          <ul>
            <li>Superadmins tienen acceso total</li>
            <li>Usuarios solo ven datos de su cliente</li>
            <li>Funciones auxiliares: <code>get_current_user_id()</code>, <code>get_user_cliente_id()</code>, <code>has_role()</code></li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Estructura del Proyecto</CardTitle>
          <CardDescription>Organización de archivos y directorios</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`src/
├── components/
│   ├── auth/              # Autenticación
│   │   ├── AuthLayout.tsx
│   │   └── RoleGuard.tsx
│   ├── config/            # Formularios de configuración
│   │   ├── ConfigDataTable.tsx
│   │   └── forms/
│   ├── intelligent-plan/  # Generador de planes
│   ├── import/            # Importación CSV
│   ├── layout/            # Layout principal
│   │   └── AppLayout.tsx
│   ├── plan-generator/    # Generador de planes
│   └── ui/                # Componentes shadcn/ui
├── hooks/
│   ├── useAuthTranslation.tsx
│   ├── useMenuPermissions.tsx
│   ├── useTranslation.tsx
│   └── useUserRole.tsx
├── integrations/
│   └── supabase/
│       ├── client.ts      # Cliente Supabase
│       └── types.ts       # Tipos TypeScript generados
├── lib/
│   ├── codeGenerator.ts   # Generador de códigos únicos
│   ├── planGeneratorAlgorithm.ts
│   └── utils.ts
├── pages/
│   ├── Auth.tsx
│   ├── Dashboard.tsx
│   ├── Panelistas.tsx
│   ├── Envios.tsx
│   ├── NuevoEnvio.tsx
│   ├── EditarEnvio.tsx
│   ├── Incidencias.tsx
│   ├── Nodos.tsx
│   ├── Topology.tsx
│   ├── UnassignedNodes.tsx
│   ├── DataImport.tsx
│   ├── IntelligentPlanGenerator.tsx
│   ├── MassivePanelistChange.tsx
│   ├── PanelistMaterialsPlan.tsx
│   └── config/            # Páginas de configuración
└── App.tsx`}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Módulos Principales</CardTitle>
          <CardDescription>Descripción de funcionalidades principales</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>Dashboard</h3>
          <p>Panel principal con métricas y resúmenes del sistema.</p>

          <h3>Gestión de Panelistas</h3>
          <p>CRUD completo de panelistas con:</p>
          <ul>
            <li>Asignación de nodos</li>
            <li>Gestión de disponibilidad horaria</li>
            <li>Cambio masivo de panelistas</li>
            <li>Plan de materiales por panelista</li>
          </ul>

          <h3>Gestión de Envíos</h3>
          <p>Sistema completo de gestión de envíos:</p>
          <ul>
            <li>Creación manual de envíos</li>
            <li>Importación masiva vía CSV</li>
            <li>Generador inteligente de planes</li>
            <li>Estados y seguimiento</li>
            <li>Notificaciones automáticas</li>
          </ul>

          <h3>Generador Inteligente de Planes</h3>
          <p>Algoritmo que genera planes de asignación basados en:</p>
          <ul>
            <li>Estacionalidad de productos</li>
            <li>Requisitos de ciudades</li>
            <li>Matriz de clasificación</li>
            <li>Límites de eventos por panelista</li>
            <li>Disponibilidad de nodos</li>
            <li>Capacidad de carriers</li>
          </ul>

          <h3>Gestión de Incidencias</h3>
          <p>Sistema de tickets con:</p>
          <ul>
            <li>Clasificación por tipo y prioridad</li>
            <li>Asignación de gestores</li>
            <li>Seguimiento de estados</li>
            <li>Historial de cambios</li>
          </ul>

          <h3>Topología de Red</h3>
          <p>Visualización y gestión de la red de nodos:</p>
          <ul>
            <li>Vista jerárquica: Región → Ciudad → Nodo</li>
            <li>Identificación de nodos sin asignar</li>
            <li>Asignación masiva de panelistas</li>
          </ul>

          <h3>Configuración</h3>
          <p>Módulos de configuración para admins:</p>
          <ul>
            <li>Clientes (solo superadmin)</li>
            <li>Usuarios y roles</li>
            <li>Permisos de menú</li>
            <li>Regiones y ciudades</li>
            <li>Nodos</li>
            <li>Productos y materiales</li>
            <li>Carriers</li>
            <li>Workflows</li>
            <li>Plantillas de mensajes</li>
            <li>Idiomas y traducciones</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. APIs y Funciones Edge</CardTitle>
          <CardDescription>Funciones serverless disponibles</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>create-admin-user</h3>
          <p>Crea usuarios administradores en Supabase Auth.</p>
          <ul>
            <li><strong>Método:</strong> POST</li>
            <li><strong>Parámetros:</strong> email, password, nombre_completo</li>
          </ul>

          <h3>reset-user-password</h3>
          <p>Resetea la contraseña de un usuario.</p>
          <ul>
            <li><strong>Método:</strong> POST</li>
            <li><strong>Parámetros:</strong> email, newPassword</li>
          </ul>

          <h3>sync-users-auth</h3>
          <p>Sincroniza usuarios de la tabla usuarios a Supabase Auth.</p>
          <ul>
            <li><strong>Método:</strong> POST</li>
            <li>Genera contraseñas temporales</li>
            <li>Auto-confirma emails</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Seguridad</CardTitle>
          <CardDescription>Consideraciones de seguridad</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>Autenticación</h3>
          <ul>
            <li>Basada en Supabase Auth</li>
            <li>Tokens JWT con refresh automático</li>
            <li>Persistencia en localStorage</li>
          </ul>

          <h3>Autorización</h3>
          <ul>
            <li>Sistema de roles jerárquico</li>
            <li>RLS policies en todas las tablas</li>
            <li>Validación en backend y frontend</li>
            <li>RoleGuard para protección de rutas</li>
          </ul>

          <h3>Aislamiento de Datos</h3>
          <ul>
            <li>Separación por cliente_id</li>
            <li>RLS automático basado en sesión</li>
            <li>Funciones helper para validación</li>
          </ul>

          <h3>Permisos de Menú</h3>
          <ul>
            <li>Configurables por rol</li>
            <li>Control granular de acceso</li>
            <li>Superadmin y admin tienen acceso total</li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

function UserDocumentation() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>1. Introducción</CardTitle>
          <CardDescription>Bienvenido al Sistema de Gestión de Envíos</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            Este sistema permite gestionar de manera eficiente los envíos postales, panelistas,
            incidencias y toda la operativa relacionada con la medición de calidad postal.
          </p>

          <h3>Roles de Usuario</h3>
          <ul>
            <li><strong>Superadministrador:</strong> Acceso total, gestiona múltiples clientes</li>
            <li><strong>Administrador:</strong> Gestión completa dentro de su organización</li>
            <li><strong>Coordinador:</strong> Coordina envíos y panelistas</li>
            <li><strong>Manager:</strong> Gestión operativa diaria</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Acceso al Sistema</CardTitle>
          <CardDescription>Cómo iniciar sesión y navegar</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>Inicio de Sesión</h3>
          <ol>
            <li>Accede a la URL del sistema</li>
            <li>Ingresa tu email y contraseña</li>
            <li>Haz clic en "Iniciar Sesión"</li>
          </ol>

          <h3>Recuperar Contraseña</h3>
          <ol>
            <li>En la pantalla de login, haz clic en "¿Olvidaste tu contraseña?"</li>
            <li>Ingresa tu email</li>
            <li>Recibirás un enlace para resetear tu contraseña</li>
          </ol>

          <h3>Navegación</h3>
          <p>El menú lateral izquierdo contiene todas las secciones del sistema:</p>
          <ul>
            <li><strong>Dashboard:</strong> Panel principal con métricas</li>
            <li><strong>Panelists:</strong> Gestión de panelistas</li>
            <li><strong>Allocation Plan:</strong> Planes de envío</li>
            <li><strong>Incidents:</strong> Gestión de incidencias</li>
            <li><strong>Measurement Topology:</strong> Estructura de nodos</li>
            <li><strong>Import Data:</strong> Importación masiva</li>
            <li><strong>Configuration:</strong> Configuración del sistema</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Dashboard</CardTitle>
          <CardDescription>Panel principal del sistema</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            El dashboard muestra un resumen general del estado del sistema:
          </p>
          <ul>
            <li>Estadísticas de envíos</li>
            <li>Incidencias pendientes</li>
            <li>Estado de panelistas</li>
            <li>Métricas de rendimiento</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Gestión de Panelistas</CardTitle>
          <CardDescription>Cómo gestionar panelistas</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>Ver Panelistas</h3>
          <ol>
            <li>Ve a "Panelists" en el menú lateral</li>
            <li>Verás una tabla con todos los panelistas</li>
            <li>Usa los filtros para buscar panelistas específicos</li>
          </ol>

          <h3>Crear Nuevo Panelista</h3>
          <ol>
            <li>Haz clic en "Nuevo Panelista"</li>
            <li>Completa el formulario:
              <ul>
                <li>Nombre completo</li>
                <li>Email y teléfono</li>
                <li>Dirección completa</li>
                <li>Nodo asignado</li>
                <li>Horario de disponibilidad</li>
                <li>Días de comunicación preferidos</li>
                <li>Idioma</li>
                <li>Plataforma de comunicación preferida</li>
              </ul>
            </li>
            <li>Haz clic en "Guardar"</li>
          </ol>

          <h3>Editar Panelista</h3>
          <ol>
            <li>Haz clic en el botón de edición junto al panelista</li>
            <li>Modifica los campos necesarios</li>
            <li>Guarda los cambios</li>
          </ol>

          <h3>Cambio Masivo de Panelistas</h3>
          <ol>
            <li>Ve a "Panelists" → "Massive Panelist Change"</li>
            <li>Selecciona un rango de fechas</li>
            <li>Elige el panelista origen a reemplazar</li>
            <li>Selecciona el nuevo panelista</li>
            <li>Confirma el cambio masivo</li>
          </ol>

          <h3>Plan de Materiales</h3>
          <ol>
            <li>Ve a "Panelists" → "Panelist Materials Plan"</li>
            <li>Selecciona un rango de fechas</li>
            <li>Haz clic en "Cargar Datos"</li>
            <li>Revisa los materiales necesarios por panelista</li>
            <li>Exporta a CSV si es necesario</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Gestión de Envíos</CardTitle>
          <CardDescription>Cómo gestionar el plan de envíos</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>Ver Plan de Envíos</h3>
          <ol>
            <li>Ve a "Allocation Plan" → "View Plan"</li>
            <li>Verás todos los envíos programados</li>
            <li>Filtra por fecha, estado, nodo, etc.</li>
          </ol>

          <h3>Crear Envío Manual</h3>
          <ol>
            <li>Haz clic en "Nuevo Envío"</li>
            <li>Completa el formulario:
              <ul>
                <li>Fecha programada</li>
                <li>Nodo origen y destino</li>
                <li>Panelistas (si están asignados)</li>
                <li>Producto</li>
                <li>Carrier</li>
              </ul>
            </li>
            <li>Guarda el envío</li>
          </ol>

          <h3>Editar Envío</h3>
          <ol>
            <li>Haz clic en el envío que deseas editar</li>
            <li>Modifica los campos necesarios</li>
            <li>Actualiza el estado si es necesario</li>
            <li>Guarda los cambios</li>
          </ol>

          <h3>Estados de Envío</h3>
          <ul>
            <li><strong>PENDING:</strong> Pendiente de notificación</li>
            <li><strong>SENDER_NOTIFIED:</strong> Remitente notificado</li>
            <li><strong>SENT:</strong> Enviado</li>
            <li><strong>RECEIVER_NOTIFIED:</strong> Destinatario notificado</li>
            <li><strong>RECEIVED:</strong> Recibido</li>
            <li><strong>COMPLETED:</strong> Completado</li>
            <li><strong>CANCELLED:</strong> Cancelado</li>
          </ul>

          <h3>Generador Inteligente de Planes</h3>
          <ol>
            <li>Ve a "Allocation Plan" → "Intelligent Plan Generator"</li>
            <li>Configura los parámetros:
              <ul>
                <li>Cliente (si eres superadmin)</li>
                <li>Carrier</li>
                <li>Producto</li>
                <li>Rango de fechas</li>
                <li>Total de eventos a generar</li>
                <li>Máximo de eventos por semana por panelista</li>
              </ul>
            </li>
            <li>Revisa la estacionalidad del producto (pestaña "Product Seasonality")</li>
            <li>Configura los requisitos de ciudades (pestaña "City Requirements")</li>
            <li>Ajusta la matriz de clasificación (pestaña "Classification Matrix")</li>
            <li>Genera el plan preliminar</li>
            <li>Revisa eventos existentes y no asignados</li>
            <li>Confirma y fusiona el plan con el existente</li>
          </ol>

          <h3>Importar Plan desde CSV</h3>
          <ol>
            <li>Ve a "Allocation Plan" y haz clic en "Import CSV Plan"</li>
            <li>Descarga la plantilla CSV</li>
            <li>Completa el archivo con los datos</li>
            <li>Sube el archivo</li>
            <li>Revisa los errores si los hay</li>
            <li>Confirma la importación</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Gestión de Incidencias</CardTitle>
          <CardDescription>Cómo registrar y gestionar incidencias</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>Ver Incidencias</h3>
          <ol>
            <li>Ve a "Incidents" en el menú</li>
            <li>Verás todas las incidencias registradas</li>
            <li>Filtra por estado, prioridad, tipo, etc.</li>
          </ol>

          <h3>Crear Nueva Incidencia</h3>
          <ol>
            <li>Haz clic en "Nueva Incidencia"</li>
            <li>Completa:
              <ul>
                <li>Tipo de incidencia</li>
                <li>Prioridad (alta, media, baja)</li>
                <li>Panelista afectado</li>
                <li>Envío relacionado (opcional)</li>
                <li>Descripción del problema</li>
                <li>Gestor asignado</li>
              </ul>
            </li>
            <li>Guarda la incidencia</li>
          </ol>

          <h3>Actualizar Estado</h3>
          <ol>
            <li>Abre la incidencia</li>
            <li>Cambia el estado según corresponda:
              <ul>
                <li>Abierta</li>
                <li>En proceso</li>
                <li>Resuelta</li>
                <li>Cerrada</li>
              </ul>
            </li>
            <li>Agrega comentarios sobre la resolución</li>
          </ol>

          <h3>Historial de Incidencias</h3>
          <p>Cada incidencia mantiene un registro completo de:</p>
          <ul>
            <li>Cambios de estado</li>
            <li>Comentarios</li>
            <li>Usuario que realizó cada acción</li>
            <li>Fechas de cada cambio</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7. Topología de Medición</CardTitle>
          <CardDescription>Gestión de la red de nodos</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>Vista de Topología</h3>
          <ol>
            <li>Ve a "Measurement Topology" → "View Topology"</li>
            <li>Verás la estructura jerárquica:
              <ul>
                <li>Regiones</li>
                <li>Ciudades (con clasificación A, B, C)</li>
                <li>Nodos</li>
              </ul>
            </li>
            <li>Expande cada nivel para ver detalles</li>
          </ol>

          <h3>Nodos Sin Asignar</h3>
          <ol>
            <li>Ve a "Measurement Topology" → "Unassigned Nodes"</li>
            <li>Verás todos los nodos sin panelista asignado</li>
            <li>Asigna panelistas según sea necesario</li>
          </ol>

          <h3>Gestionar Nodos</h3>
          <ol>
            <li>Ve a "Nodos" en el menú</li>
            <li>Crea, edita o elimina nodos</li>
            <li>Asigna nodos a ciudades y panelistas</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>8. Importación de Datos</CardTitle>
          <CardDescription>Cómo importar datos masivamente</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>Importar Datos</h3>
          <ol>
            <li>Ve a "Import Data"</li>
            <li>Selecciona el tipo de dato a importar:
              <ul>
                <li>Panelistas</li>
                <li>Nodos</li>
                <li>Ciudades</li>
                <li>Productos</li>
                <li>Etc.</li>
              </ul>
            </li>
            <li>Descarga la plantilla CSV</li>
            <li>Completa el archivo siguiendo el formato</li>
            <li>Sube el archivo</li>
            <li>Revisa los errores si los hay</li>
            <li>Confirma la importación</li>
          </ol>

          <h3>Guía de Importación</h3>
          <p>Ve a "Import Guide" para ver:</p>
          <ul>
            <li>Formato de cada tipo de archivo</li>
            <li>Campos obligatorios y opcionales</li>
            <li>Ejemplos de datos válidos</li>
            <li>Errores comunes y cómo evitarlos</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>9. Configuración</CardTitle>
          <CardDescription>Configuración del sistema (solo administradores)</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>Gestión de Usuarios</h3>
          <ol>
            <li>Ve a "Configuration" → "Users"</li>
            <li>Crea nuevos usuarios</li>
            <li>Asigna roles</li>
            <li>Gestiona estados (activo/inactivo)</li>
          </ol>

          <h3>Permisos de Menú</h3>
          <ol>
            <li>Ve a "Configuration" → "Menu Permissions"</li>
            <li>Configura qué roles pueden acceder a cada sección</li>
            <li>Guarda los cambios</li>
          </ol>

          <h3>Productos y Materiales</h3>
          <ol>
            <li>Ve a "Configuration" → "Products"</li>
            <li>Gestiona productos</li>
            <li>Asocia materiales necesarios a cada producto</li>
            <li>Define cantidades y obligatoriedad</li>
          </ol>

          <h3>Carriers</h3>
          <ol>
            <li>Ve a "Configuration" → "Carriers"</li>
            <li>Registra operadores logísticos</li>
            <li>Asocia productos que pueden transportar</li>
            <li>Gestiona datos regulatorios</li>
          </ol>

          <h3>Workflows</h3>
          <ol>
            <li>Ve a "Configuration" → "Workflows"</li>
            <li>Configura tiempos de recordatorios</li>
            <li>Define escalaciones automáticas</li>
            <li>Establece tipo de días (calendario o hábiles)</li>
          </ol>

          <h3>Plantillas de Mensajes</h3>
          <ol>
            <li>Ve a "Configuration" → "Message Templates"</li>
            <li>Gestiona plantillas multiidioma</li>
            <li>Define variables disponibles</li>
            <li>Personaliza contenidos</li>
          </ol>

          <h3>Regiones y Ciudades</h3>
          <ol>
            <li>Ve a "Configuration" → "Regions" o "Cities"</li>
            <li>Gestiona la estructura geográfica</li>
            <li>Asigna clasificaciones a ciudades</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>10. Perfil de Usuario</CardTitle>
          <CardDescription>Gestiona tu perfil personal</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>Acceder a tu Perfil</h3>
          <ol>
            <li>Haz clic en tu nombre en la parte superior derecha</li>
            <li>Selecciona "Perfil"</li>
          </ol>

          <h3>Cambiar Idioma</h3>
          <ol>
            <li>En tu perfil, selecciona el idioma preferido</li>
            <li>La interfaz se actualizará automáticamente</li>
          </ol>

          <h3>Cambiar Contraseña</h3>
          <ol>
            <li>En tu perfil, haz clic en "Cambiar Contraseña"</li>
            <li>Ingresa tu contraseña actual</li>
            <li>Ingresa la nueva contraseña</li>
            <li>Confirma el cambio</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>11. Consejos y Mejores Prácticas</CardTitle>
          <CardDescription>Recomendaciones para usar el sistema</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <h3>Gestión de Envíos</h3>
          <ul>
            <li>Utiliza el generador inteligente de planes para ahorrar tiempo</li>
            <li>Revisa regularmente los envíos pendientes</li>
            <li>Actualiza los estados en tiempo real</li>
            <li>Registra observaciones importantes en cada envío</li>
          </ul>

          <h3>Gestión de Panelistas</h3>
          <ul>
            <li>Mantén actualizados los datos de contacto</li>
            <li>Verifica horarios de disponibilidad frecuentemente</li>
            <li>Utiliza el cambio masivo para reasignaciones grandes</li>
            <li>Genera el plan de materiales con antelación</li>
          </ul>

          <h3>Incidencias</h3>
          <ul>
            <li>Registra incidencias lo antes posible</li>
            <li>Asigna prioridades correctamente</li>
            <li>Mantén actualizado el estado</li>
            <li>Documenta resoluciones para referencia futura</li>
          </ul>

          <h3>Importación de Datos</h3>
          <ul>
            <li>Revisa la guía de importación antes de subir archivos</li>
            <li>Valida los datos antes de importar</li>
            <li>Importa en lotes pequeños primero para probar</li>
            <li>Guarda los archivos CSV de respaldo</li>
          </ul>

          <h3>Seguridad</h3>
          <ul>
            <li>Cierra sesión al terminar tu trabajo</li>
            <li>No compartas tus credenciales</li>
            <li>Cambia tu contraseña periódicamente</li>
            <li>Reporta actividades sospechosas al administrador</li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

function generateMarkdownContent(): string {
  return `# Documentación del Sistema de Gestión de Envíos

Generado el: ${new Date().toLocaleDateString()}

---

## Índice

### Documentación Técnica
1. Arquitectura del Sistema
2. Base de Datos
3. Estructura del Proyecto
4. Módulos Principales
5. APIs y Funciones Edge
6. Seguridad

### Manual de Usuario
1. Introducción
2. Acceso al Sistema
3. Dashboard
4. Gestión de Panelistas
5. Gestión de Envíos
6. Gestión de Incidencias
7. Topología de Medición
8. Importación de Datos
9. Configuración
10. Perfil de Usuario
11. Consejos y Mejores Prácticas

---

# DOCUMENTACIÓN TÉCNICA

## 1. Arquitectura del Sistema

### Stack Tecnológico

- **Frontend:** React 18 + TypeScript
- **UI Framework:** Tailwind CSS + shadcn/ui
- **Estado y Datos:** TanStack Query (React Query)
- **Routing:** React Router v6
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Build Tool:** Vite

### Características Principales

- Sistema multi-cliente con aislamiento de datos
- Autenticación y autorización basada en roles
- Gestión de envíos postales y panelistas
- Generador inteligente de planes de asignación
- Sistema de incidencias y seguimiento
- Importación masiva de datos vía CSV
- Soporte multi-idioma

## 2. Base de Datos

### Entidades Principales

#### Clientes
Tabla raíz que representa organizaciones. Todos los datos están aislados por cliente.

- \`id\`: Identificador único
- \`codigo\`: Código único de 4 dígitos
- \`nombre\`: Nombre del cliente
- \`pais\`: País del cliente
- \`max_events_per_panelist_week\`: Límite de eventos por semana

#### Usuarios
Gestión de usuarios del sistema con roles asignados.

- \`id\`: Identificador único
- \`email\`: Email único
- \`nombre_completo\`: Nombre completo
- \`cliente_id\`: Referencia al cliente
- \`idioma_preferido\`: Idioma de la interfaz

#### Roles y Permisos

Sistema de roles jerárquico:

- **superadmin:** Acceso total al sistema, gestión de clientes
- **admin:** Gestión completa dentro de su cliente
- **coordinator:** Coordinación de envíos y panelistas
- **manager:** Gestión operativa

#### Regiones y Ciudades
Jerarquía geográfica para organizar nodos.

- \`regiones\`: Áreas geográficas amplias
- \`ciudades\`: Ciudades con clasificación (A, B, C)
- Criterios de clasificación basados en volumen poblacional y tráfico postal

#### Nodos
Puntos de envío/recepción asociados a ciudades y panelistas.

- \`codigo\`: Código único del nodo
- \`ciudad_id\`: Referencia a ciudad
- \`panelista_id\`: Panelista asignado (opcional)
- \`estado\`: activo/inactivo

#### Panelistas
Personas que participan en el envío/recepción de productos.

- \`nombre_completo\`: Nombre del panelista
- \`nodo_asignado\`: Nodo donde opera
- \`direccion_*\`: Datos de dirección completa
- \`horario_inicio/fin\`: Disponibilidad
- \`dias_comunicacion\`: Preferencia de días
- \`idioma\`: Idioma de comunicación
- \`gestor_asignado_id\`: Usuario responsable

#### Productos
Tipos de productos que se envían.

- \`codigo_producto\`: Código único
- \`nombre_producto\`: Nombre descriptivo
- \`standard_delivery_hours\`: Tiempo estándar de entrega
- \`cliente_id\`: Cliente propietario

#### Tipos de Material
Materiales necesarios para los envíos.

- \`codigo\`: Código único
- \`nombre\`: Nombre del material
- \`unidad_medida\`: Unidad (unidad, kg, m, etc.)

#### Producto-Materiales
Relación entre productos y los materiales que requieren.

- \`producto_id\`: Producto
- \`tipo_material_id\`: Material
- \`cantidad\`: Cantidad requerida
- \`es_obligatorio\`: Si es obligatorio

#### Carriers
Operadores logísticos que realizan los envíos.

- \`carrier_code\`: Código único
- \`legal_name/commercial_name\`: Nombres del carrier
- \`operator_type\`: Tipo de operador
- \`regulatory_status\`: Estado regulatorio
- \`geographic_scope\`: Alcance geográfico

#### Envíos
Registros de envíos programados y realizados.

- \`nodo_origen/destino\`: Nodos de envío
- \`panelista_origen_id/destino_id\`: Panelistas involucrados
- \`producto_id\`: Producto enviado
- \`carrier_id\`: Carrier asignado
- \`fecha_programada\`: Fecha planificada
- \`fecha_envio_real/recepcion_real\`: Fechas reales
- \`estado\`: PENDING, SENDER_NOTIFIED, SENT, RECEIVED, etc.
- \`motivo_creacion\`: manual, csv_import, plan_generation

#### Incidencias
Seguimiento de problemas y resoluciones.

- \`tipo\`: Tipo de incidencia
- \`prioridad\`: alta, media, baja
- \`estado\`: abierta, en_proceso, resuelta, cerrada
- \`panelista_id\`: Panelista afectado
- \`envio_id\`: Envío relacionado (opcional)
- \`gestor_asignado_id\`: Usuario responsable

### Row Level Security (RLS)

Todas las tablas tienen políticas RLS que garantizan:

- Superadmins tienen acceso total
- Usuarios solo ven datos de su cliente
- Funciones auxiliares: \`get_current_user_id()\`, \`get_user_cliente_id()\`, \`has_role()\`

## 3. Estructura del Proyecto

\`\`\`
src/
├── components/
│   ├── auth/              # Autenticación
│   ├── config/            # Formularios de configuración
│   ├── intelligent-plan/  # Generador de planes
│   ├── import/            # Importación CSV
│   ├── layout/            # Layout principal
│   ├── plan-generator/    # Generador de planes
│   └── ui/                # Componentes shadcn/ui
├── hooks/
│   ├── useAuthTranslation.tsx
│   ├── useMenuPermissions.tsx
│   ├── useTranslation.tsx
│   └── useUserRole.tsx
├── integrations/
│   └── supabase/
│       ├── client.ts      # Cliente Supabase
│       └── types.ts       # Tipos TypeScript generados
├── lib/
│   ├── codeGenerator.ts
│   ├── planGeneratorAlgorithm.ts
│   └── utils.ts
├── pages/
│   ├── [páginas principales]
│   └── config/            # Páginas de configuración
└── App.tsx
\`\`\`

## 4. Seguridad

### Autenticación
- Basada en Supabase Auth
- Tokens JWT con refresh automático
- Persistencia en localStorage

### Autorización
- Sistema de roles jerárquico
- RLS policies en todas las tablas
- Validación en backend y frontend
- RoleGuard para protección de rutas

### Aislamiento de Datos
- Separación por cliente_id
- RLS automático basado en sesión
- Funciones helper para validación

---

# MANUAL DE USUARIO

## 1. Introducción

Este sistema permite gestionar de manera eficiente los envíos postales, panelistas, incidencias y toda la operativa relacionada con la medición de calidad postal.

### Roles de Usuario

- **Superadministrador:** Acceso total, gestiona múltiples clientes
- **Administrador:** Gestión completa dentro de su organización
- **Coordinador:** Coordina envíos y panelistas
- **Manager:** Gestión operativa diaria

## 2. Acceso al Sistema

### Inicio de Sesión

1. Accede a la URL del sistema
2. Ingresa tu email y contraseña
3. Haz clic en "Iniciar Sesión"

### Navegación

El menú lateral izquierdo contiene todas las secciones del sistema:

- **Dashboard:** Panel principal con métricas
- **Panelists:** Gestión de panelistas
- **Allocation Plan:** Planes de envío
- **Incidents:** Gestión de incidencias
- **Measurement Topology:** Estructura de nodos
- **Import Data:** Importación masiva
- **Configuration:** Configuración del sistema

## 3. Gestión de Panelistas

### Ver Panelistas

1. Ve a "Panelists" en el menú lateral
2. Verás una tabla con todos los panelistas
3. Usa los filtros para buscar panelistas específicos

### Crear Nuevo Panelista

1. Haz clic en "Nuevo Panelista"
2. Completa el formulario (nombre, email, dirección, nodo, horario, idioma, etc.)
3. Haz clic en "Guardar"

### Cambio Masivo de Panelistas

1. Ve a "Panelists" → "Massive Panelist Change"
2. Selecciona un rango de fechas
3. Elige el panelista origen a reemplazar
4. Selecciona el nuevo panelista
5. Confirma el cambio masivo

### Plan de Materiales

1. Ve a "Panelists" → "Panelist Materials Plan"
2. Selecciona un rango de fechas
3. Haz clic en "Cargar Datos"
4. Revisa los materiales necesarios por panelista
5. Exporta a CSV si es necesario

## 4. Gestión de Envíos

### Ver Plan de Envíos

1. Ve a "Allocation Plan" → "View Plan"
2. Verás todos los envíos programados
3. Filtra por fecha, estado, nodo, etc.

### Crear Envío Manual

1. Haz clic en "Nuevo Envío"
2. Completa el formulario (fecha, nodos, panelistas, producto, carrier)
3. Guarda el envío

### Generador Inteligente de Planes

1. Ve a "Allocation Plan" → "Intelligent Plan Generator"
2. Configura los parámetros (cliente, carrier, producto, fechas, total eventos)
3. Revisa la estacionalidad del producto
4. Configura los requisitos de ciudades
5. Ajusta la matriz de clasificación
6. Genera el plan preliminar
7. Confirma y fusiona el plan con el existente

## 5. Gestión de Incidencias

### Ver Incidencias

1. Ve a "Incidents" en el menú
2. Verás todas las incidencias registradas
3. Filtra por estado, prioridad, tipo, etc.

### Crear Nueva Incidencia

1. Haz clic en "Nueva Incidencia"
2. Completa tipo, prioridad, panelista, descripción, gestor
3. Guarda la incidencia

## 6. Mejores Prácticas

### Gestión de Envíos
- Utiliza el generador inteligente de planes para ahorrar tiempo
- Revisa regularmente los envíos pendientes
- Actualiza los estados en tiempo real

### Gestión de Panelistas
- Mantén actualizados los datos de contacto
- Verifica horarios de disponibilidad frecuentemente
- Genera el plan de materiales con antelación

### Seguridad
- Cierra sesión al terminar tu trabajo
- No compartas tus credenciales
- Cambia tu contraseña periódicamente

---

© ${new Date().getFullYear()} - Sistema de Gestión de Envíos
`;
}

function generateHTMLContent(): string {
  const markdownContent = generateMarkdownContent();
  
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentación del Sistema</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    h1 {
      color: #2563eb;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
      margin-bottom: 30px;
      font-size: 2.5em;
    }
    
    h2 {
      color: #1e40af;
      margin-top: 40px;
      margin-bottom: 20px;
      font-size: 2em;
      border-left: 5px solid #2563eb;
      padding-left: 15px;
    }
    
    h3 {
      color: #1e3a8a;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 1.5em;
    }
    
    h4 {
      color: #1e40af;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 1.2em;
    }
    
    p {
      margin-bottom: 15px;
      text-align: justify;
    }
    
    ul, ol {
      margin-left: 30px;
      margin-bottom: 15px;
    }
    
    li {
      margin-bottom: 8px;
    }
    
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #dc2626;
    }
    
    pre {
      background: #1f2937;
      color: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 20px 0;
      font-family: 'Courier New', monospace;
      font-size: 0.85em;
      line-height: 1.5;
    }
    
    strong {
      color: #1e40af;
      font-weight: 600;
    }
    
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 40px 0;
    }
    
    .toc {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
      border-left: 5px solid #2563eb;
    }
    
    .toc h2 {
      margin-top: 0;
      border: none;
      padding: 0;
    }
    
    .header-info {
      color: #6b7280;
      font-style: italic;
      margin-bottom: 30px;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        padding: 20px;
      }
      
      h2 {
        page-break-after: avoid;
      }
      
      pre {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <pre style="white-space: pre-wrap; color: #333; background: white; padding: 0;">${markdownContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  </div>
</body>
</html>`;
}
