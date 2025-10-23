import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CiudadForm } from "@/components/config/forms/CiudadForm";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";

export default function Ciudades() {
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
    const { data: ciudades, error } = await supabase
      .from("ciudades")
      .select(`
        *,
        clientes:cliente_id (nombre),
        regiones:region_id (nombre)
      `)
      .order("nombre", { ascending: true });

    if (error) {
      toast({
        title: "Error loading cities",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const formattedData = ciudades?.map(c => ({
        ...c,
        cliente_nombre: c.clientes?.nombre,
        region_nombre: c.regiones?.nombre
      })) || [];
      setData(formattedData);
    }
    setIsLoading(false);
  };

  const handleDelete = async (item: any) => {
    const { error } = await supabase
      .from("ciudades")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Error deleting city",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "City deleted successfully" });
      loadData();
    }
  };

  const columns = [
    { key: "codigo", label: "Code" },
    { key: "nombre", label: "Name" },
    { key: "cliente_nombre", label: "Client" },
    { key: "region_nombre", label: "Region" },
    { key: "clasificacion", label: "Classification" },
    { key: "pais", label: "Country" },
    { key: "estado", label: "Status" },
  ];

  const csvConfig = {
    tableName: "ciudades",
    expectedColumns: ["cliente_id", "region_id", "codigo", "nombre", "codigo_postal_principal", "pais", "clasificacion", "latitud", "longitud", "estado"],
    exampleData: [
      ["1", "1", "MAD01", "Madrid Centro", "28001", "España", "A", "40.4168", "-3.7038", "activo"],
      ["1", "1", "BCN01", "Barcelona Centro", "08001", "España", "A", "41.3851", "2.1734", "activo"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/configuracion/regiones">Regions</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Cities</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Cities Configuration</h1>
          <p className="text-muted-foreground">
            Manage cities catalog with GPS positioning
          </p>
        </div>

        <ConfigDataTable
          title="Cities"
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New City</DialogTitle>
            </DialogHeader>
            <CiudadForm
              onSuccess={() => {
                setCreateDialogOpen(false);
                loadData();
              }}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit City</DialogTitle>
            </DialogHeader>
            <CiudadForm
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
