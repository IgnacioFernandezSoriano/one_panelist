import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkflowForm } from "@/components/config/forms/WorkflowForm";
import { useTranslation } from "@/hooks/useTranslation";

export default function ConfigWorkflows() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

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
    { 
      key: "tipo_dias", 
      label: "Day Type",
      render: (row: any) => {
        const dayType = row.tipo_dias;
        if (!dayType) return "-";
        // Translate using the same keys as the form
        return t(`workflow.day_type.${dayType}`);
      }
    },
    { key: "hours_sender_first_reminder", label: "Sender 1st Reminder" },
    { key: "hours_sender_second_reminder", label: "Sender 2nd Reminder" },
    { key: "hours_sender_escalation", label: "Sender Escalation" },
    { key: "hours_receiver_verification", label: "Receiver Verification" },
    { key: "hours_receiver_escalation", label: "Receiver Escalation" },
  ];

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
        />

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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