import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClienteForm } from "@/components/config/forms/ClienteForm";
import { Badge } from "@/components/ui/badge";

export default function ConfigClientes() {
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
    const { data: clientes, error } = await supabase
      .from("clientes")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      toast({
        title: "Error loading clients",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setData(clientes || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (item: any) => {
    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Error deleting client",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Client deleted successfully" });
      loadData();
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "codigo", label: "Code" },
    { key: "nombre", label: "Name" },
    { key: "pais", label: "Country" },
    { 
      key: "estado", 
      label: "Status",
      render: (item: any) => item.estado === "activo" ? (
        <Badge variant="default" className="bg-success text-white">Active</Badge>
      ) : (
        <Badge variant="destructive" className="bg-destructive text-white">Inactive</Badge>
      )
    },
    { key: "fecha_alta", label: "Created" },
  ];

  const csvConfig = {
    tableName: "clientes",
    expectedColumns: ["codigo", "nombre", "pais", "estado"],
    exampleData: [
      ["CLI001", "Cliente A", "España", "activo"],
      ["CLI002", "Cliente B", "México", "activo"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Clients Configuration</h1>
          <p className="text-muted-foreground">
            Manage client records in the system
          </p>
        </div>

        <ConfigDataTable
          title="Clients"
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
              <DialogTitle>Create New Client</DialogTitle>
            </DialogHeader>
            <ClienteForm
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
              <DialogTitle>Edit Client</DialogTitle>
            </DialogHeader>
            <ClienteForm
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