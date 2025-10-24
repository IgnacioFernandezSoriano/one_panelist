import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkflowForm } from "@/components/config/forms/WorkflowForm";

export default function ConfigWorkflows() {
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
    const { data: workflows, error } = await supabase
      .from("configuracion_workflows")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      toast({
        title: "Error loading workflows",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setData(workflows || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (item: any) => {
    const { error } = await supabase
      .from("configuracion_workflows")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Error deleting workflow",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Workflow deleted successfully" });
      loadData();
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "cliente_id", label: "Account ID" },
    { key: "producto_id", label: "Product ID" },
    { key: "servicio_postal", label: "Postal Service" },
    { key: "tipo_dias", label: "Day Type" },
    { key: "horas_verificacion_recepcion_receptor", label: "Receiver Verification (hrs)" },
    { key: "horas_recordatorio_receptor", label: "Receiver Reminder (hrs)" },
    { key: "horas_escalamiento", label: "Escalation (hrs)" },
  ];

  const csvConfig = {
    tableName: "configuracion_workflows",
    expectedColumns: [
      "cliente_id", "producto_id", "servicio_postal", "tipo_dias", "horas_verificacion_recepcion_receptor",
      "horas_recordatorio_receptor", "horas_escalamiento", "horas_declarar_extravio", "horas_segunda_verificacion_receptor"
    ],
    exampleData: [
      ["1", "1", "Correos", "habiles", "72", "48", "120", "360", "168"],
      ["2", "2", "DHL", "calendario", "48", "24", "72", "240", "120"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Workflows Configuration</h1>
          <p className="text-muted-foreground">
            Manage workflow configurations by account
          </p>
        </div>

        <ConfigDataTable
          title="Workflow Configurations"
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
              <DialogTitle>Create New Workflow</DialogTitle>
            </DialogHeader>
            <WorkflowForm
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
              <DialogTitle>Edit Workflow</DialogTitle>
            </DialogHeader>
            <WorkflowForm
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