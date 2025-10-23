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

  const columns = [
    { key: "codigo", label: "Code" },
    { key: "nombre", label: "Name" },
    { key: "tipo", label: "Type" },
    { key: "ciudad", label: "City" },
    { key: "pais", label: "Country" },
    { key: "estado", label: "Status" },
  ];

  const csvConfig = {
    tableName: "nodos",
    expectedColumns: ["codigo", "nombre", "tipo", "ciudad", "pais", "estado"],
    exampleData: [
      ["MAD", "Madrid Centro", "urbano", "Madrid", "España", "activo"],
      ["BCN", "Barcelona Norte", "urbano", "Barcelona", "España", "activo"],
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
      </div>
    </AppLayout>
  );
}