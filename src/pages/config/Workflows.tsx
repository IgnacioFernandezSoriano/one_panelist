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
    { key: "servicio_postal", label: "Postal Service" },
    { key: "tipo_dias", label: "Day Type" },
    { key: "dias_verificacion_recepcion", label: "Verification Days" },
    { key: "dias_recordatorio", label: "Reminder Days" },
    { key: "dias_escalamiento", label: "Escalation Days" },
  ];

  const csvConfig = {
    tableName: "configuracion_workflows",
    expectedColumns: [
      "cliente_id", "servicio_postal", "tipo_dias", "dias_verificacion_recepcion",
      "dias_recordatorio", "dias_escalamiento", "dias_declarar_extravio", "dias_segunda_verificacion"
    ],
    exampleData: [
      ["1", "Correos", "habiles", "3", "2", "5", "15", "7"],
      ["2", "DHL", "calendario", "2", "1", "3", "10", "5"],
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