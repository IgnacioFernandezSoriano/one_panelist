import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ConfigIncidencias() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const { data: incidencias, error } = await supabase
      .from("incidencias")
      .select("*")
      .order("id", { ascending: true })
      .limit(100);

    if (error) {
      toast({
        title: "Error loading issues",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setData(incidencias || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (item: any) => {
    const { error } = await supabase
      .from("incidencias")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Error deleting issue",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Issue deleted successfully" });
      loadData();
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "tipo", label: "Type" },
    { key: "origen", label: "Origin" },
    { key: "prioridad", label: "Priority" },
    { key: "estado", label: "Status" },
    { key: "panelista_id", label: "Panelist ID" },
    { key: "envio_id", label: "Shipment ID" },
    { key: "descripcion", label: "Description" },
  ];

  const csvConfig = {
    tableName: "incidencias",
    expectedColumns: [
      "tipo", "origen", "prioridad", "estado", "panelista_id", "envio_id",
      "descripcion", "gestor_asignado_id", "datos_adicionales"
    ],
    exampleData: [
      ["no_recibido", "automatico", "alta", "abierta", "1", "1", "Envío no recibido en plazo", "1", "{}"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Issues Configuration</h1>
          <p className="text-muted-foreground">
            Manage issue records in the system (showing last 100)
          </p>
        </div>

        <ConfigDataTable
          title="Issues"
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