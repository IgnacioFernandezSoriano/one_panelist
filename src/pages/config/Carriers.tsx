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
      .select("*")
      .order("legal_name", { ascending: true });

    if (error) {
      toast({
        title: "Error loading carriers",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setData(carriers || []);
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

  const getRegulatoryStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; className: string }> = {
      authorized: { variant: "default", className: "bg-success text-white" },
      suspended: { variant: "secondary", className: "bg-orange-500 text-white" },
      sanctioned: { variant: "destructive", className: "bg-red-700 text-white" },
      revoked: { variant: "destructive", className: "bg-destructive text-white" },
    };
    const config = variants[status] || variants.authorized;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge variant="default" className="bg-success text-white">Active</Badge>
    ) : (
      <Badge variant="destructive" className="bg-destructive text-white">Inactive</Badge>
    );
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "legal_name", label: "Legal Name" },
    { key: "commercial_name", label: "Commercial Name" },
    { key: "operator_type", label: "Type" },
    { 
      key: "regulatory_status", 
      label: "Regulatory Status",
      render: (item: any) => getRegulatoryStatusBadge(item.regulatory_status)
    },
    { key: "geographic_scope", label: "Scope" },
    { 
      key: "status", 
      label: "Status",
      render: (item: any) => getStatusBadge(item.status)
    },
  ];

  const csvConfig = {
    tableName: "carriers",
    expectedColumns: [
      "legal_name", "commercial_name", "tax_id", "operator_type",
      "license_number", "regulatory_status", "authorization_date", "license_expiration_date",
      "legal_representative", "phone", "email", "website", "geographic_scope", "status", "carrier_code"
    ],
    exampleData: [
      ["Sociedad Estatal Correos y Telégrafos", "Correos", "A83052407", "universal_postal", 
       "LIC-2020-001", "authorized", "2020-01-01", "2030-12-31", "Juan García", 
       "+34900123456", "info@correos.es", "https://www.correos.es", "national", "active", "CORREOS"],
      ["DHL Express Spain S.L.", "DHL", "B12345678", "courier", 
       "LIC-2019-050", "authorized", "2019-06-15", "2029-06-15", "María López", 
       "+34900789012", "info@dhl.es", "https://www.dhl.es", "international", "active", "DHL"],
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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