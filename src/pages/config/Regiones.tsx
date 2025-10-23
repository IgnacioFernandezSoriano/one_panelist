import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RegionForm } from "@/components/config/forms/RegionForm";

export default function Regiones() {
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
    const { data: regiones, error } = await supabase
      .from("regiones")
      .select(`
        *,
        clientes:cliente_id (nombre)
      `)
      .order("nombre", { ascending: true });

    if (error) {
      toast({
        title: "Error loading regions",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const formattedData = regiones?.map(r => ({
        ...r,
        cliente_nombre: r.clientes?.nombre
      })) || [];
      setData(formattedData);
    }
    setIsLoading(false);
  };

  const handleDelete = async (item: any) => {
    const { error } = await supabase
      .from("regiones")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Error deleting region",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Region deleted successfully" });
      loadData();
    }
  };

  const columns = [
    { key: "codigo", label: "Code" },
    { key: "nombre", label: "Name" },
    { key: "cliente_nombre", label: "Client" },
    { key: "pais", label: "Country" },
    { key: "estado", label: "Status" },
  ];

  const csvConfig = {
    tableName: "regiones",
    expectedColumns: ["cliente_id", "codigo", "nombre", "pais", "descripcion", "estado"],
    exampleData: [
      ["1", "MAD", "Región Madrid", "España", "Región de Madrid", "activo"],
      ["1", "CAT", "Cataluña", "España", "Región de Cataluña", "activo"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Regions Configuration</h1>
          <p className="text-muted-foreground">
            Manage geographic regions by client
          </p>
        </div>

        <ConfigDataTable
          title="Regions"
          data={data}
          columns={columns}
          onEdit={(item) => {
            setSelectedItem(item);
            setEditDialogOpen(true);
          }}
          onDelete={handleDelete}
          onCreate={() => setCreateDialogOpen(true)}
          isLoading={isLoading}
          csvConfig={csvConfig}
        />

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Region</DialogTitle>
            </DialogHeader>
            <RegionForm
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
              <DialogTitle>Edit Region</DialogTitle>
            </DialogHeader>
            <RegionForm
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
