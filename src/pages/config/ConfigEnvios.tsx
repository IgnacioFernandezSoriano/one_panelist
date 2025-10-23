import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ConfigEnvios() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const { data: envios, error } = await supabase
      .from("envios")
      .select("*")
      .order("id", { ascending: true })
      .limit(100);

    if (error) {
      toast({
        title: "Error loading shipments",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setData(envios || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (item: any) => {
    const { error } = await supabase
      .from("envios")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Error deleting shipment",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Shipment deleted successfully" });
      loadData();
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "codigo", label: "Code" },
    { key: "cliente_id", label: "Client ID" },
    { key: "panelista_origen_id", label: "Origin Panelist" },
    { key: "panelista_destino_id", label: "Dest. Panelist" },
    { key: "nodo_origen", label: "Origin Node" },
    { key: "nodo_destino", label: "Dest. Node" },
    { key: "estado", label: "Status" },
    { key: "fecha_programada", label: "Scheduled" },
  ];

  const csvConfig = {
    tableName: "envios",
    expectedColumns: [
      "codigo", "cliente_id", "panelista_origen_id", "panelista_destino_id",
      "nodo_origen", "nodo_destino", "fecha_programada", "fecha_limite",
      "tipo_producto", "estado", "motivo_creacion"
    ],
    exampleData: [
      ["ENV001", "1", "1", "2", "MAD", "BCN", "2024-01-15", "2024-01-20", "paquete", "PENDIENTE", "inicial"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Shipments Configuration</h1>
          <p className="text-muted-foreground">
            Manage shipment records in the system (showing last 100)
          </p>
        </div>

        <ConfigDataTable
          title="Shipments"
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