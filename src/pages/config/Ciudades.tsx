import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CiudadForm } from "@/components/config/forms/CiudadForm";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function Ciudades() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
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
      setFilteredData(formattedData);
    }
    setIsLoading(false);
  };

  // Filter data based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(data);
      return;
    }

    const lowercaseSearch = searchTerm.toLowerCase();
    const filtered = data.filter((city: any) => {
      return (
        city.codigo?.toLowerCase().includes(lowercaseSearch) ||
        city.nombre?.toLowerCase().includes(lowercaseSearch) ||
        city.cliente_nombre?.toLowerCase().includes(lowercaseSearch) ||
        city.region_nombre?.toLowerCase().includes(lowercaseSearch) ||
        city.clasificacion?.toLowerCase().includes(lowercaseSearch) ||
        city.pais?.toLowerCase().includes(lowercaseSearch)
      );
    });

    setFilteredData(filtered);
  }, [searchTerm, data]);

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
    { key: "cliente_nombre", label: "Account" },
    { key: "region_nombre", label: "Region" },
    { 
      key: "clasificacion", 
      label: "Classification",
      render: (item: any) => {
        const getClassificationColor = (clasificacion: string) => {
          switch (clasificacion?.toUpperCase()) {
            case 'A':
              return 'bg-green-500 text-white';
            case 'B':
              return 'bg-blue-500 text-white';
            case 'C':
              return 'bg-yellow-500 text-white';
            case 'D':
              return 'bg-orange-500 text-white';
            default:
              return 'bg-gray-500 text-white';
          }
        };
        return (
          <Badge className={getClassificationColor(item.clasificacion)}>
            {item.clasificacion}
          </Badge>
        );
      }
    },
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

        {/* Search Filter */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('common.search_cities')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
                onClick={() => setSearchTerm("")}
              >
                Clear
              </Button>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              {filteredData.length} {filteredData.length === 1 ? 'city' : 'cities'} found
            </p>
          )}
        </div>

        <ConfigDataTable
          title="Cities"
          data={filteredData}
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
