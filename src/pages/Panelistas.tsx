import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Search, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PanelistaForm } from "@/components/config/forms/PanelistaForm";
import { useTranslation } from "@/hooks/useTranslation";
import { useUserRole } from "@/hooks/useUserRole";

interface Panelista {
  id: number;
  nombre_completo: string;
  email: string | null;
  telefono: string;
  direccion_calle: string;
  direccion_ciudad: string;
  direccion_codigo_postal: string;
  direccion_pais: string;
  nodo_asignado: string | null;
  idioma: string;
  plataforma_preferida: string;
  zona_horaria: string;
  dias_comunicacion: string;
  horario_inicio: string;
  horario_fin: string;
  gestor_asignado_id: number | null;
  estado: string;
  fecha_alta: string;
  ciudad_id: number | null;
  availability_status: string | null;
  cliente_id: number;
  scheduled_leaves?: Array<{
    leave_start_date: string;
    leave_end_date: string;
    status: string;
  }>;
}

export default function Panelistas() {
  const { t } = useTranslation();
  const { clienteId, isSuperAdmin } = useUserRole();
  const [panelistas, setPanelistas] = useState<Panelista[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPanelista, setSelectedPanelista] = useState<Panelista | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const toggleExpand = (id: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  useEffect(() => {
    loadPanelistas();
  }, []);

  const loadPanelistas = async () => {
    try {
      let query = supabase
        .from("panelistas")
        .select(`
          *,
          scheduled_leaves!left(
            leave_start_date,
            leave_end_date,
            status
          )
        `)
        .order("fecha_alta", { ascending: false });
      
      // Filter by cliente_id unless user is superadmin
      if (!isSuperAdmin() && clienteId) {
        query = query.eq("cliente_id", clienteId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPanelistas(data || []);
    } catch (error: any) {
      toast({
        title: t('message.error'),
        description: t('panelistas.error_loading'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPanelistas = panelistas.filter((p) =>
    p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.telefono.includes(searchTerm) ||
    p.direccion_ciudad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (panelista: Panelista) => {
    if (!confirm(t('panelistas.confirm_delete', { name: panelista.nombre_completo }))) {
      return;
    }

    try {
      const { error } = await supabase
        .from("panelistas")
        .delete()
        .eq("id", panelista.id);

      if (error) throw error;

      toast({
        title: t('message.success'),
        description: t('panelistas.deleted_successfully'),
      });
      loadPanelistas();
    } catch (error: any) {
      toast({
        title: t('message.error'),
        description: t('panelistas.error_deleting') + ": " + error.message,
        variant: "destructive",
      });
    }
  };

  const getEstadoBadge = (panelista: Panelista) => {
    // Priority 1: Check availability status (temporary leave)
    if (panelista.availability_status === 'temporary_leave') {
      const activeLeave = panelista.scheduled_leaves?.find(
        leave => leave.status === 'active'
      );
      
      return (
        <div className="space-y-1">
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            Baja Temporal
          </Badge>
          {activeLeave && (
            <p className="text-xs text-muted-foreground">
              Hasta: {new Date(activeLeave.leave_end_date).toLocaleDateString('es-ES')}
            </p>
          )}
        </div>
      );
    }

    // Priority 2: Check scheduled future leaves
    const scheduledLeave = panelista.scheduled_leaves?.find(
      leave => leave.status === 'scheduled'
    );
    
    if (scheduledLeave && panelista.estado === 'activo') {
      return (
        <div className="space-y-1">
          <Badge variant="default" className="bg-success text-white">{t('status.active')}</Badge>
          <p className="text-xs text-blue-600">
            Baja desde: {new Date(scheduledLeave.leave_start_date).toLocaleDateString('es-ES')}
          </p>
        </div>
      );
    }

    // Priority 3: Regular status
    if (panelista.estado === "activo") {
      return <Badge variant="default" className="bg-success text-white">{t('status.active')}</Badge>;
    } else if (panelista.estado === "suspendido") {
      return <Badge variant="destructive" className="bg-destructive text-white">{t('status.suspended')}</Badge>;
    } else {
      return <Badge variant="destructive" className="bg-destructive text-white">{t('status.inactive')}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t('panelistas.title')}</h1>
            <p className="text-muted-foreground">
              {t('panelistas.subtitle')}
            </p>
          </div>
          <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            {t('button.new_panelist')}
          </Button>
        </div>

        <Card className="p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder={t('panelistas.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('message.loading')}</p>
          </div>
        ) : filteredPanelistas.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">{t('panelistas.no_data_found')}</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPanelistas.map((panelista) => (
              <Card key={panelista.id} className="hover:shadow-lg transition-shadow">
                <Collapsible open={expandedItems.has(panelista.id)} onOpenChange={() => toggleExpand(panelista.id)}>
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {panelista.nombre_completo}
                          </h3>
                          {getEstadoBadge(panelista)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">{t('label.id')}:</span>
                            <p className="font-medium">{panelista.id}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('label.city')}:</span>
                            <p className="font-medium">{panelista.direccion_ciudad}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('label.phone')}:</span>
                            <p className="font-medium">{panelista.telefono}</p>
                          </div>
                        </div>
                        
                        <CollapsibleContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm mt-4 pt-4 border-t">
                            <div>
                              <span className="text-muted-foreground">Email:</span>
                              {panelista.email ? (
                                <a 
                                  href={`mailto:${panelista.email}`}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {panelista.email}
                                </a>
                              ) : (
                                <p className="font-medium">N/A</p>
                              )}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Address:</span>
                              <p className="font-medium">{panelista.direccion_calle}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Postal Code:</span>
                              <p className="font-medium">{panelista.direccion_codigo_postal}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Country:</span>
                              <p className="font-medium">{panelista.direccion_pais}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Assigned Node:</span>
                              <p className="font-medium">{panelista.nodo_asignado || "Not assigned"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Language:</span>
                              <p className="font-medium">{panelista.idioma}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Preferred Platform:</span>
                              <p className="font-medium capitalize">{panelista.plataforma_preferida}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Time Zone:</span>
                              <p className="font-medium">{panelista.zona_horaria}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Communication Days:</span>
                              <p className="font-medium capitalize">{panelista.dias_comunicacion?.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Schedule:</span>
                              <p className="font-medium">{panelista.horario_inicio} - {panelista.horario_fin}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Registration Date:</span>
                              <p className="font-medium">{new Date(panelista.fecha_alta).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="icon">
                            {expandedItems.has(panelista.id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => {
                            setSelectedPanelista(panelista);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(panelista)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Panelist</DialogTitle>
            </DialogHeader>
            <PanelistaForm
              onSuccess={() => {
                setCreateDialogOpen(false);
                loadPanelistas();
                toast({
                  title: "Success",
                  description: "Panelist created successfully",
                });
              }}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Panelist</DialogTitle>
            </DialogHeader>
            {selectedPanelista && (
              <PanelistaForm
                initialData={selectedPanelista}
                onSuccess={() => {
                  setEditDialogOpen(false);
                  setSelectedPanelista(null);
                  loadPanelistas();
                  toast({
                    title: "Success",
                    description: "Panelist updated successfully",
                  });
                }}
                onCancel={() => {
                  setEditDialogOpen(false);
                  setSelectedPanelista(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
