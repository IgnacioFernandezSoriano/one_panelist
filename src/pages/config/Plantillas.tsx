import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlantillaForm } from "@/components/config/forms/PlantillaForm";

export default function ConfigPlantillas() {
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
    const { data: plantillas, error } = await supabase
      .from("plantillas_mensajes")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      toast({
        title: "Error loading templates",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setData(plantillas || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (item: any) => {
    const { error } = await supabase
      .from("plantillas_mensajes")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Error deleting template",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Template deleted successfully" });
      loadData();
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "codigo", label: "Code" },
    { key: "tipo", label: "Type" },
    { key: "idioma", label: "Language" },
    { key: "contenido", label: "Content" },
    { key: "estado", label: "Status" },
  ];

  const csvConfig = {
    tableName: "plantillas_mensajes",
    expectedColumns: ["codigo", "tipo", "idioma", "contenido", "variables", "estado"],
    exampleData: [
      ["NOTIF_ENVIO", "notificacion", "es", "Su envío {codigo} está en camino", '{"codigo": "string"}', "activa"],
      ["REMINDER_1", "recordatorio", "es", "Recordatorio: Pendiente envío {codigo}", '{"codigo": "string"}', "activa"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Message Templates Configuration</h1>
          <p className="text-muted-foreground">
            Manage message templates for notifications
          </p>
        </div>

        <ConfigDataTable
          title="Message Templates"
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <PlantillaForm
              onSuccess={() => {
                setCreateDialogOpen(false);
                loadData();
              }}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
            </DialogHeader>
            <PlantillaForm
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