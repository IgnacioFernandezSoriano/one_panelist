import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Download, AlertCircle, CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImportGuide() {
  const sections = [
    {
      title: "Import Order Recommendation",
      icon: CheckCircle,
      content: [
        "1. Clients (clientes)",
        "2. Nodes (nodos)",
        "3. Users (usuarios)",
        "4. Panelists (panelistas)",
        "5. Shipments (envios)",
        "6. Issues (incidencias)",
        "7. Message Templates (plantillas_mensajes)",
        "8. Workflow Configuration (configuracion_workflows)",
      ],
    },
    {
      title: "CSV Format Requirements",
      icon: FileText,
      content: [
        "• Files must be in CSV (Comma-Separated Values) format",
        "• First row must contain column headers",
        "• Use UTF-8 encoding",
        "• Date format: YYYY-MM-DD (e.g., 2025-11-01)",
        "• Time format: HH:MM:SS (e.g., 09:00:00)",
        "• Empty cells are allowed for optional fields",
      ],
    },
    {
      title: "Common Errors",
      icon: AlertCircle,
      content: [
        "Missing columns - Check spelling and ensure all required headers are present",
        "Invalid data - Verify date/time formats and enum values",
        "Duplicate key - Remove duplicate unique values",
        "Foreign key constraint - Import dependencies first",
      ],
    },
  ];

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">CSV Import Guide</h1>
          </div>
          <p className="text-muted-foreground">
            Complete guide for importing data using CSV files
          </p>
        </div>

        <div className="grid gap-6 mb-8">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                <li>1. Navigate to <strong>Data Import</strong> in the sidebar menu</li>
                <li>2. Select the tab for the data type you want to import</li>
                <li>3. Click <strong>Download Template</strong> to get the correct CSV format</li>
                <li>4. Fill in your data using the template</li>
                <li>5. Click <strong>Upload CSV</strong> and select your file</li>
                <li>6. Review the import results</li>
              </ol>
            </CardContent>
          </Card>

          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="w-5 h-5" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {section.content.map((item, i) => (
                    <p key={i} className="text-muted-foreground">
                      {item}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Data Types and Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold mb-1">Panelists</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Manage participants in postal quality studies
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  nombre_completo, direccion_calle, telefono, email, idioma, plataforma_preferida, etc.
                </p>
              </div>

              <div className="border-l-4 border-accent pl-4">
                <h4 className="font-semibold mb-1">Nodes</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Origin and destination points for shipments
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  codigo, nombre, ciudad, pais, tipo, estado
                </p>
              </div>

              <div className="border-l-4 border-success pl-4">
                <h4 className="font-semibold mb-1">Shipments</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Postal shipment tracking and management
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  codigo, cliente_id, nodo_origen, nodo_destino, fecha_programada, tipo_producto, estado
                </p>
              </div>

              <div className="border-l-4 border-warning pl-4">
                <h4 className="font-semibold mb-1">Issues</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Track and manage reported problems
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  tipo, panelista_id, descripcion, origen, prioridad, estado
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">💡 Pro Tip</p>
              <p className="text-sm text-muted-foreground">
                Always download and use the provided templates to ensure your CSV files have the correct format. 
                Templates include example data to help you understand the expected values.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
