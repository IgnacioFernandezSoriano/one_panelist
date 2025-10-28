import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CarrierForm } from "@/components/config/forms/CarrierForm";
import { Badge } from "@/components/ui/badge";

export default function Carriers() {
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
    const { data: carriers, error } = await supabase
      .from("carriers")
      .select(`
        *,
        clientes:cliente_id (nombre)
      `)
      .order("commercial_name", { ascending: true });

    if (error) {
      toast({
        title: "Error loading carriers",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const formattedData = carriers?.map(c => ({
        ...c,
        account_name: c.clientes?.nombre
      })) || [];
      setData(formattedData);
    }
    setIsLoading(false);
  };

  const handleDelete = async (item: any) => {
    const { error } = await supabase
      .from("carriers")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Error deleting carrier",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Carrier deleted successfully" });
      loadData();
    }
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge variant="default" className="bg-success text-white">Active</Badge>
    ) : (
      <Badge variant="destructive" className="bg-destructive text-white">Inactive</Badge>
    );
  };

  const getOperatorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      designated_usp: "Designated USP",
      licensed_postal: "Licensed Postal",
      express_courier: "Express Courier",
      ecommerce_parcel: "E-commerce Parcel",
      exempt: "Exempt",
      others: "Others"
    };
    return labels[type] || type;
  };

  const columns = [
    { key: "account_name", label: "Account" },
    { key: "commercial_name", label: "Commercial Name" },
    { 
      key: "operator_type", 
      label: "Operator Type",
      render: (item: any) => getOperatorTypeLabel(item.operator_type)
    },
    { 
      key: "status", 
      label: "Status",
      render: (item: any) => getStatusBadge(item.status)
    },
  ];

  const csvConfig = {
    tableName: "carriers",
    expectedColumns: [
      "cliente_id", "commercial_name", "operator_type", "status"
    ],
    exampleData: [
      ["1", "Correos", "designated_usp", "active"],
      ["1", "DHL", "express_courier", "active"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Carriers Configuration</h1>
          <p className="text-muted-foreground">
            Manage postal carriers and delivery operators information
          </p>
        </div>

        <ConfigDataTable
          title="Carriers"
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Carrier</DialogTitle>
            </DialogHeader>
            <CarrierForm
              onSuccess={() => {
                setCreateDialogOpen(false);
                loadData();
              }}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Carrier</DialogTitle>
            </DialogHeader>
            <CarrierForm
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