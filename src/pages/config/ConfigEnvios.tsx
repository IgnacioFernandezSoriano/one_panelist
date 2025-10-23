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
    { key: "cliente_id", label: "Client ID" },
    { key: "panelista_origen_id", label: "Origin Panelist" },
    { key: "panelista_destino_id", label: "Dest. Panelist" },
    { key: "nodo_origen", label: "Origin Node" },
    { key: "nodo_destino", label: "Dest. Node" },
    { key: "estado", label: "Status" },
    { key: "fecha_programada", label: "Scheduled" },
    { key: "fecha_limite", label: "Due Date" },
  ];

  const csvConfig = {
    tableName: "envios",
    expectedColumns: [
      "cliente_id", "nodo_origen", "nodo_destino", "fecha_programada",
      "tipo_producto", "estado", "motivo_creacion"
    ],
    exampleData: [
      ["1", "MAD", "BCN", "2024-01-15", "paquete", "PENDIENTE", "inicial"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Allocation Plan Configuration</h1>
          <p className="text-muted-foreground">
            Manage shipment records in the system (showing last 100)
          </p>
        </div>

        <ConfigDataTable
          title="Allocation Plans"
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