import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ConfigPanelistas() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const { data: panelistas, error } = await supabase
      .from("panelistas")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      toast({
        title: "Error loading panelists",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setData(panelistas || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (item: any) => {
    const { error } = await supabase
      .from("panelistas")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Error deleting panelist",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Panelist deleted successfully" });
      loadData();
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "nombre_completo", label: "Full Name" },
    { key: "email", label: "Email" },
    { key: "telefono", label: "Phone" },
    { key: "nodo_asignado", label: "Node" },
    { key: "estado", label: "Status" },
  ];

  const csvConfig = {
    tableName: "panelistas",
    expectedColumns: [
      "nombre_completo", "email", "telefono", "direccion_calle", "direccion_ciudad",
      "direccion_codigo_postal", "direccion_pais", "nodo_asignado", "idioma",
      "zona_horaria", "horario_inicio", "horario_fin", "plataforma_preferida",
      "gestor_asignado_id", "estado"
    ],
    exampleData: [
      ["Ana López", "ana@example.com", "+34600000000", "Calle Mayor 1", "Madrid", "28001", "España", "MAD", "es", "Europe/Madrid", "09:00:00", "18:00:00", "whatsapp", "1", "activo"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Panelists Configuration</h1>
          <p className="text-muted-foreground">
            Manage panelist records in the system
          </p>
        </div>

        <ConfigDataTable
          title="Panelists"
          data={data}
          columns={columns}
          onDelete={handleDelete}
          isLoading={isLoading}
          csvConfig={csvConfig}
        />
      </div>
    </AppLayout>
  );
}