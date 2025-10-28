import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NodoForm } from "@/components/config/forms/NodoForm";
import { PanelistaForm } from "@/components/config/forms/PanelistaForm";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Link, useSearchParams } from "react-router-dom";
import { Pencil, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";

export default function ConfigNodos() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [panelistaDialogOpen, setPanelistaDialogOpen] = useState(false);
  const [editPanelistaDialogOpen, setEditPanelistaDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedPanelista, setSelectedPanelista] = useState<any>(null);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadData();
  }, []);

  // Handle auto-opening edit dialog from URL parameter
  useEffect(() => {
    const editCodigo = searchParams.get("edit");
    if (editCodigo && data.length > 0) {
      const nodeToEdit = data.find((node: any) => node.codigo === editCodigo);
      if (nodeToEdit) {
        setSelectedItem(nodeToEdit);
        setEditDialogOpen(true);
        // Remove the edit parameter from URL
        searchParams.delete("edit");
        setSearchParams(searchParams);
      }
    }
  }, [data, searchParams, setSearchParams]);

  const loadData = async () => {
    setIsLoading(true);
    const { data: nodos, error } = await supabase
      .from("nodos")
      .select(`
        *,
        panelistas:panelista_id (id, nombre_completo)
      `)
      .order("codigo", { ascending: true });

    if (error) {
      toast({
        title: t('toast.error_loading_nodes'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      const formattedData = nodos?.map(n => ({
        ...n,
        panelista_nombre: n.panelistas?.nombre_completo
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
    const filtered = data.filter((node: any) => {
      return (
        node.codigo?.toLowerCase().includes(lowercaseSearch) ||
        node.ciudad?.toLowerCase().includes(lowercaseSearch) ||
        node.pais?.toLowerCase().includes(lowercaseSearch) ||
        node.panelista_nombre?.toLowerCase().includes(lowercaseSearch)
      );
    });

    setFilteredData(filtered);
  }, [searchTerm, data]);

  const handleDelete = async (item: any) => {
    const { error } = await supabase
      .from("nodos")
      .delete()
      .eq("codigo", item.codigo);

    if (error) {
      toast({
        title: t('toast.error_deleting_node'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: t('toast.node_deleted') });
      loadData();
    }
  };

  const handleDuplicate = async (item: any) => {
    try {
      // Obtener información completa del cliente, región y ciudad
      const { data: clienteData } = await supabase
        .from("clientes")
        .select("codigo")
        .eq("pais", item.pais)
        .single();

      const { data: regionData } = await supabase
        .from("regiones")
        .select("codigo")
        .eq("id", item.region_id)
        .single();

      const { data: ciudadData } = await supabase
        .from("ciudades")
        .select("codigo")
        .eq("id", item.ciudad_id)
        .single();

      if (!clienteData || !regionData || !ciudadData) {
        toast({
          title: "Error",
          description: t('toast.error_retrieve_info'),
          variant: "destructive",
        });
        return;
      }

      // Obtener el último secuencial para esta combinación
      const { data: existingNodos, error: fetchError } = await supabase
        .from("nodos")
        .select("codigo")
        .like("codigo", `${clienteData.codigo}-${regionData.codigo}-${ciudadData.codigo}-%`)
        .order("codigo", { ascending: false })
        .limit(1);

      if (fetchError) {
        toast({
          title: "Error",
          description: fetchError.message,
          variant: "destructive",
        });
        return;
      }

      let secuencial = 1;
      if (existingNodos && existingNodos.length > 0) {
        const lastCode = existingNodos[0].codigo;
        const parts = lastCode.split("-");
        secuencial = parseInt(parts[parts.length - 1]) + 1;
      }

      const newCodigo = `${clienteData.codigo}-${regionData.codigo}-${ciudadData.codigo}-${secuencial.toString().padStart(4, "0")}`;

      // Crear el nodo duplicado con el nuevo código
      const { error: insertError } = await supabase
        .from("nodos")
        .insert([{
          codigo: newCodigo,
          region_id: item.region_id,
          ciudad_id: item.ciudad_id,
          pais: item.pais,
          ciudad: item.ciudad,
          estado: item.estado,
        }]);

      if (insertError) {
        toast({
          title: "Error",
          description: insertError.message,
          variant: "destructive",
        });
      } else {
        toast({ title: t('toast.node_duplicated') });
        loadData();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const columns = [
    { key: "codigo", label: t('nodes.code') },
    { key: "ciudad", label: t('nodes.city') },
    { key: "pais", label: t('nodes.country') },
    { 
      key: "panelista_nombre", 
      label: t('nodes.panelist'),
      render: (item: any) => {
        if (!item.panelista_nombre) return "-";
        return (
          <button
            onClick={async () => {
              const { data: panelistaData } = await supabase
                .from("panelistas")
                .select("*")
                .eq("id", item.panelista_id)
                .single();
              
              if (panelistaData) {
                setSelectedPanelista(panelistaData);
                setPanelistaDialogOpen(true);
              }
            }}
            className="text-primary hover:underline"
          >
            {item.panelista_nombre}
          </button>
        );
      }
    },
    { 
      key: "estado", 
      label: t('nodes.status'),
      render: (item: any) => item.estado === "activo" ? (
        <Badge variant="default" className="bg-success text-white">{t('status.active')}</Badge>
      ) : (
        <Badge variant="destructive" className="bg-destructive text-white">{t('status.inactive')}</Badge>
      )
    },
  ];

  const csvConfig = {
    tableName: "nodos",
    expectedColumns: ["region_id", "ciudad_id", "panelista_id", "ciudad", "pais", "estado"],
    exampleData: [
      ["1", "1", "", "Madrid", "España", "activo"],
      ["2", "2", "1", "Barcelona", "España", "activo"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/configuracion/regiones">{t('breadcrumb.regions')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/configuracion/ciudades">{t('breadcrumb.cities')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t('breadcrumb.nodes')}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('nodes.title')}</h1>
          <p className="text-muted-foreground">
            {t('nodes.description')}
          </p>
        </div>

        {/* Search Filter */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('common.search_nodes')}
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
                {t('common.clear')}
              </Button>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              {filteredData.length} {filteredData.length === 1 ? t('common.node') : t('common.nodes')} {t('common.found')}
            </p>
          )}
        </div>

        <ConfigDataTable
          title={t('breadcrumb.nodes')}
          data={filteredData}
          columns={columns}
          onEdit={(item) => {
            setSelectedItem(item);
            setEditDialogOpen(true);
          }}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onCreate={() => setCreateDialogOpen(true)}
          isLoading={isLoading}
          csvConfig={csvConfig}
        />

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('nodes.create_title')}</DialogTitle>
            </DialogHeader>
            <NodoForm
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
              <DialogTitle>{t('nodes.edit_title')}</DialogTitle>
            </DialogHeader>
            <NodoForm
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

        <Dialog open={panelistaDialogOpen} onOpenChange={setPanelistaDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                {t('panelist.information')}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setPanelistaDialogOpen(false);
                    setEditPanelistaDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  {t('action.edit')}
                </Button>
              </DialogTitle>
            </DialogHeader>
            {selectedPanelista && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('panelist.full_name')}</p>
                    <p className="text-foreground">{selectedPanelista.nombre_completo}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('panelist.email')}</p>
                    <p className="text-foreground">{selectedPanelista.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('panelist.phone')}</p>
                    <p className="text-foreground">{selectedPanelista.telefono}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('panelist.assigned_node')}</p>
                    <p className="text-foreground">{selectedPanelista.nodo_asignado || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('panelist.preferred_platform')}</p>
                    <p className="text-foreground capitalize">{selectedPanelista.plataforma_preferida}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('panelist.communication_days')}</p>
                    <p className="text-foreground capitalize">{selectedPanelista.dias_comunicacion?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('panelist.language')}</p>
                    <p className="text-foreground uppercase">{selectedPanelista.idioma}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('panelist.status')}</p>
                    <p className="text-foreground capitalize">{selectedPanelista.estado}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('panelist.address')}</p>
                  <p className="text-foreground">
                    {selectedPanelista.direccion_calle}, {selectedPanelista.direccion_ciudad}, {selectedPanelista.direccion_codigo_postal}, {selectedPanelista.direccion_pais}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('panelist.schedule')}</p>
                    <p className="text-foreground">{selectedPanelista.horario_inicio} - {selectedPanelista.horario_fin}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('panelist.timezone')}</p>
                    <p className="text-foreground">{selectedPanelista.zona_horaria}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={editPanelistaDialogOpen} onOpenChange={setEditPanelistaDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('panelist.edit_title')}</DialogTitle>
            </DialogHeader>
            <PanelistaForm
              initialData={selectedPanelista}
              onSuccess={() => {
                setEditPanelistaDialogOpen(false);
                setSelectedPanelista(null);
                loadData();
                toast({ title: t('toast.panelist_updated') });
              }}
              onCancel={() => {
                setEditPanelistaDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}