import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, MessageSquare, Users2, Workflow } from "lucide-react";

export default function Configuracion() {
  const configSections = [
    {
      icon: Workflow,
      title: "Workflows",
      description: "Configuración de flujos de trabajo y tiempos",
      count: "3 configuraciones",
    },
    {
      icon: MessageSquare,
      title: "Plantillas de Mensajes",
      description: "Gestiona las plantillas de notificaciones",
      count: "12 plantillas",
    },
    {
      icon: Users2,
      title: "Usuarios y Gestores",
      description: "Administra los usuarios del sistema",
      count: "8 usuarios",
    },
    {
      icon: Settings2,
      title: "Configuración General",
      description: "Parámetros generales del sistema",
      count: "Configurar",
    },
  ];

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Configuración</h1>
          <p className="text-muted-foreground">
            Gestiona la configuración del sistema
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {configSections.map((section) => (
            <Card 
              key={section.title} 
              className="p-6 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all">
                  <section.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {section.title}
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    {section.description}
                  </p>
                  <p className="text-sm font-medium text-primary">
                    {section.count}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
