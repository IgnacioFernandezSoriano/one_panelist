import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CSVImporter } from "@/components/import/CSVImporter";
import { Database, BookOpen, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DataImport() {
  const panelistasTemplate = [
    {
      nombre_completo: "John Doe",
      direccion_calle: "123 Main Street",
      direccion_ciudad: "New York",
      direccion_codigo_postal: "10001",
      direccion_pais: "USA",
      telefono: "+1234567890",
      email: "john@example.com",
      idioma: "EN",
      plataforma_preferida: "whatsapp",
      zona_horaria: "America/New_York",
      horario_inicio: "09:00:00",
      horario_fin: "17:00:00",
      nodo_asignado: "NYC001",
      estado: "activo",
    },
  ];

  const nodosTemplate = [
    {
      codigo: "NYC001",
      nombre: "New York Central Hub",
      ciudad: "New York",
      pais: "USA",
      tipo: "centro_logistico",
      estado: "activo",
    },
  ];

  const clientesTemplate = [
    {
      nombre: "Acme Corporation",
      codigo: "ACME001",
      pais: "USA",
      estado: "activo",
    },
  ];

  const enviosTemplate = [
    {
      codigo: "ENV001",
      cliente_id: 1,
      nodo_origen: "NYC001",
      nodo_destino: "LA001",
      panelista_origen_id: 1,
      panelista_destino_id: 2,
      fecha_programada: "2025-11-01",
      fecha_limite: "2025-11-05",
      tipo_producto: "carta",
      estado: "PENDIENTE",
      motivo_creacion: "programado",
    },
  ];

  const incidenciasTemplate = [
    {
      tipo: "no_disponible",
      panelista_id: 1,
      envio_id: 1,
      descripcion: "Panelist not available for scheduled date",
      origen: "gestor",
      prioridad: "media",
      estado: "abierta",
    },
  ];

  const usuariosTemplate = [
    {
      nombre_completo: "Admin User",
      email: "admin@example.com",
      password_hash: "$2a$10$...", // Note: In production, passwords should be hashed
      rol: "administrador",
      telefono: "+1234567890",
      estado: "activo",
    },
  ];

  const plantillasTemplate = [
    {
      codigo: "NOTIF_ENVIO",
      tipo: "notificacion_envio",
      idioma: "EN",
      contenido: "Hello {{name}}, your shipment {{codigo}} has been scheduled.",
      estado: "activa",
    },
  ];

  const workflowsTemplate = [
    {
      cliente_id: 1,
      servicio_postal: "standard",
      dias_recordatorio: 2,
      dias_escalamiento: 5,
      dias_verificacion_recepcion: 7,
      dias_segunda_verificacion: 10,
      dias_declarar_extravio: 15,
      tipo_dias: "naturales",
    },
  ];

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Data Import</h1>
          </div>
          <p className="text-muted-foreground mb-4">
            Import data in bulk using CSV files in the correct order. Follow the numbered sequence (1-8) to avoid foreign key errors.
          </p>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.href = "/import-guide"}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              View Complete Import Guide
            </Button>
          </div>
        </div>

        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Import Order Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              To prevent foreign key constraint errors, import data in this sequence:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>Clients</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>Nodes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>Users</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">4.</span>
                <span>Templates</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">5.</span>
                <span>Panelists</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">6.</span>
                <span>Allocation Plans</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">7.</span>
                <span>Workflows</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">8.</span>
                <span>Issues</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="clientes" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="clientes">1. Clients</TabsTrigger>
            <TabsTrigger value="nodos">2. Nodes</TabsTrigger>
            <TabsTrigger value="usuarios">3. Users</TabsTrigger>
            <TabsTrigger value="plantillas">4. Templates</TabsTrigger>
            <TabsTrigger value="panelistas">5. Panelists</TabsTrigger>
            <TabsTrigger value="envios">6. Allocation Plans</TabsTrigger>
            <TabsTrigger value="workflows">7. Workflows</TabsTrigger>
            <TabsTrigger value="incidencias">8. Issues</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="clientes">
              <CSVImporter
                tableName="clientes"
                tableLabel="Clients"
                expectedColumns={["nombre", "codigo", "pais", "estado"]}
                exampleData={clientesTemplate}
              />
            </TabsContent>

            <TabsContent value="nodos">
              <CSVImporter
                tableName="nodos"
                tableLabel="Nodes"
                expectedColumns={["codigo", "nombre", "ciudad", "pais", "tipo", "estado"]}
                exampleData={nodosTemplate}
              />
            </TabsContent>

            <TabsContent value="usuarios">
              <CSVImporter
                tableName="usuarios"
                tableLabel="Users"
                expectedColumns={[
                  "nombre_completo",
                  "email",
                  "password_hash",
                  "rol",
                  "telefono",
                  "estado",
                ]}
                exampleData={usuariosTemplate}
              />
            </TabsContent>

            <TabsContent value="plantillas">
              <CSVImporter
                tableName="plantillas_mensajes"
                tableLabel="Message Templates"
                expectedColumns={["codigo", "tipo", "idioma", "contenido", "estado"]}
                exampleData={plantillasTemplate}
              />
            </TabsContent>

            <TabsContent value="panelistas">
              <CSVImporter
                tableName="panelistas"
                tableLabel="Panelists"
                expectedColumns={[
                  "nombre_completo",
                  "direccion_calle",
                  "direccion_ciudad",
                  "direccion_codigo_postal",
                  "direccion_pais",
                  "telefono",
                  "email",
                  "idioma",
                  "plataforma_preferida",
                  "zona_horaria",
                  "horario_inicio",
                  "horario_fin",
                  "nodo_asignado",
                  "estado",
                ]}
                exampleData={panelistasTemplate}
              />
            </TabsContent>

            <TabsContent value="envios">
              <CSVImporter
                tableName="envios"
                tableLabel="Allocation Plans"
                expectedColumns={[
                  "codigo",
                  "cliente_id",
                  "nodo_origen",
                  "nodo_destino",
                  "panelista_origen_id",
                  "panelista_destino_id",
                  "fecha_programada",
                  "fecha_limite",
                  "tipo_producto",
                  "estado",
                  "motivo_creacion",
                ]}
                exampleData={enviosTemplate}
              />
            </TabsContent>

            <TabsContent value="workflows">
              <CSVImporter
                tableName="configuracion_workflows"
                tableLabel="Workflow Configuration"
                expectedColumns={[
                  "cliente_id",
                  "servicio_postal",
                  "dias_recordatorio",
                  "dias_escalamiento",
                  "dias_verificacion_recepcion",
                  "dias_segunda_verificacion",
                  "dias_declarar_extravio",
                  "tipo_dias",
                ]}
                exampleData={workflowsTemplate}
              />
            </TabsContent>

            <TabsContent value="incidencias">
              <CSVImporter
                tableName="incidencias"
                tableLabel="Issues"
                expectedColumns={[
                  "tipo",
                  "panelista_id",
                  "envio_id",
                  "descripcion",
                  "origen",
                  "prioridad",
                  "estado",
                ]}
                exampleData={incidenciasTemplate}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}
