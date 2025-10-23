import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NodoForm } from "@/components/config/forms/NodoForm";

export default function ConfigNodos() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const { data: nodos, error } = await supabase
      .from("nodos")
      .select("*")
      .order("codigo", { ascending: true });

    if (error) {
      toast({
        title: "Error loading nodes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setData(nodos || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (item: any) => {
    const { error } = await supabase
      .from("nodos")
      .delete()
      .eq("codigo", item.codigo);

    if (error) {
      toast({
        title: "Error deleting node",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Node deleted successfully" });
      loadData();
    }
  };

  const handleDuplicate = async (item: any) => {
    try {
      // Obtener información completa del cliente, región y ciudad
      const { data: clienteData } = await supabase
        .from("clientes")
        .select("codigo")
        .eq("pais", item.pais)
        .single();

      const { data: regionData } = await supabase
        .from("regiones")
        .select("codigo")
        .eq("id", item.region_id)
        .single();

      const { data: ciudadData } = await supabase
        .from("ciudades")
        .select("codigo")
        .eq("id", item.ciudad_id)
        .single();

      if (!clienteData || !regionData || !ciudadData) {
        toast({
          title: "Error",
          description: "Could not retrieve node information",
          variant: "destructive",
        });
        return;
      }

      // Obtener el último secuencial para esta combinación
      const { data: existingNodos, error: fetchError } = await supabase
        .from("nodos")
        .select("codigo")
        .like("codigo", `${clienteData.codigo}-${regionData.codigo}-${ciudadData.codigo}-%`)
        .order("codigo", { ascending: false })
        .limit(1);

      if (fetchError) {
        toast({
          title: "Error",
          description: fetchError.message,
          variant: "destructive",
        });
        return;
      }

      let secuencial = 1;
      if (existingNodos && existingNodos.length > 0) {
        const lastCode = existingNodos[0].codigo;
        const parts = lastCode.split("-");
        secuencial = parseInt(parts[parts.length - 1]) + 1;
      }

      const newCodigo = `${clienteData.codigo}-${regionData.codigo}-${ciudadData.codigo}-${secuencial.toString().padStart(4, "0")}`;

      // Crear el nodo duplicado con el nuevo código
      const { error: insertError } = await supabase
        .from("nodos")
        .insert([{
          codigo: newCodigo,
          region_id: item.region_id,
          ciudad_id: item.ciudad_id,
          pais: item.pais,
          ciudad: item.ciudad,
          estado: item.estado,
        }]);

      if (insertError) {
        toast({
          title: "Error duplicating node",
          description: insertError.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Node duplicated successfully" });
        loadData();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const columns = [
    { key: "codigo", label: "Code" },
    { key: "ciudad", label: "City" },
    { key: "pais", label: "Country" },
    { key: "estado", label: "Status" },
  ];

  const csvConfig = {
    tableName: "nodos",
    expectedColumns: ["codigo", "region_id", "ciudad_id", "ciudad", "pais", "estado"],
    exampleData: [
      ["ESP-01-001-0001", "1", "1", "Madrid", "España", "activo"],
      ["ESP-02-002-0001", "2", "2", "Barcelona", "España", "activo"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Nodes Configuration</h1>
          <p className="text-muted-foreground">
            Manage node locations in the system
          </p>
        </div>

        <ConfigDataTable
          title="Nodes"
          data={data}
          columns={columns}
          onEdit={(item) => {
            setSelectedItem(item);
            setEditDialogOpen(true);
          }}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onCreate={() => setCreateDialogOpen(true)}
          isLoading={isLoading}
          csvConfig={csvConfig}
        />

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Node</DialogTitle>
            </DialogHeader>
            <NodoForm
              onSuccess={() => {
                setCreateDialogOpen(false);
                loadData();
              }}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Node</DialogTitle>
            </DialogHeader>
            <NodoForm
              initialData={selectedItem}
              onSuccess={() => {
                setEditDialogOpen(false);
                setSelectedItem(null);
                loadData();
              }}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedItem(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}