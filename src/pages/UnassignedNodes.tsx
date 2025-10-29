import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, ExternalLink, Search, Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { NodoForm } from "@/components/config/forms/NodoForm";
import { useTranslation } from "@/hooks/useTranslation";

interface UnassignedNode {
  codigo: string;
  ciudad: string;
  pais: string;
  estado: string;
  region_id: number | null;
  ciudad_id: number | null;
  region_nombre: string | null;
  ciudad_nombre: string | null;
  affectedEventsCount: number;
  firstEventDate: string | null;
}

export default function UnassignedNodes() {
  const { t } = useTranslation();
  const [unassignedNodes, setUnassignedNodes] = useState<UnassignedNode[]>([]);
  const [filteredNodes, setFilteredNodes] = useState<UnassignedNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const { toast } = useToast();

  useEffect(() => {
    loadUnassignedNodes();
  }, []);

  // Apply filters whenever filter states or unassignedNodes change
  useEffect(() => {
    applyFilters();
  }, [unassignedNodes, searchQuery, statusFilter, dateFrom, dateTo]);

  const applyFilters = () => {
    let filtered = [...unassignedNodes];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(node => 
        node.codigo.toLowerCase().includes(query) ||
        node.ciudad.toLowerCase().includes(query) ||
        node.pais.toLowerCase().includes(query) ||
        (node.region_nombre && node.region_nombre.toLowerCase().includes(query)) ||
        (node.ciudad_nombre && node.ciudad_nombre.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(node => node.estado === statusFilter);
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filtered = filtered.filter(node => {
        if (!node.firstEventDate) return false;
        
        const eventDate = new Date(node.firstEventDate);
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;

        if (from && to) {
          return eventDate >= from && eventDate <= to;
        } else if (from) {
          return eventDate >= from;
        } else if (to) {
          return eventDate <= to;
        }
        return true;
      });
    }

    setFilteredNodes(filtered);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || dateFrom || dateTo;

  const loadUnassignedNodes = async () => {
    setLoading(true);
    try {
      // Get all nodes without assigned panelist (both active and inactive)
      const { data: nodesData, error: nodesError } = await supabase
        .from("nodos")
        .select(`
          codigo, 
          ciudad, 
          pais, 
          estado,
          region_id, 
          ciudad_id,
          regiones:region_id(nombre),
          ciudades:ciudad_id(nombre)
        `)
        .is("panelista_id", null)
        .order("estado", { ascending: false })
        .order("codigo");

      if (nodesError) throw nodesError;

      if (!nodesData || nodesData.length === 0) {
        setUnassignedNodes([]);
        setLoading(false);
        return;
      }

      // For each node, get the count of affected events and first event date
      const nodesWithStats = await Promise.all(
        nodesData.map(async (node: any) => {
          // Count events where this node is origin or destination
          const { data: enviosData, error: enviosError } = await supabase
            .from("envios")
            .select("fecha_programada")
            .or(`nodo_origen.eq.${node.codigo},nodo_destino.eq.${node.codigo}`)
            .order("fecha_programada", { ascending: true });

          if (enviosError) {
            console.error("Error fetching envios for node:", node.codigo, enviosError);
            return {
              codigo: node.codigo,
              ciudad: node.ciudad,
              pais: node.pais,
              estado: node.estado,
              region_id: node.region_id,
              ciudad_id: node.ciudad_id,
              region_nombre: node.regiones?.nombre || null,
              ciudad_nombre: node.ciudades?.nombre || null,
              affectedEventsCount: 0,
              firstEventDate: null,
            };
          }

          return {
            codigo: node.codigo,
            ciudad: node.ciudad,
            pais: node.pais,
            estado: node.estado,
            region_id: node.region_id,
            ciudad_id: node.ciudad_id,
            region_nombre: node.regiones?.nombre || null,
            ciudad_nombre: node.ciudades?.nombre || null,
            affectedEventsCount: enviosData?.length || 0,
            firstEventDate: enviosData && enviosData.length > 0 ? enviosData[0].fecha_programada : null,
          };
        })
      );

      setUnassignedNodes(nodesWithStats);
    } catch (error: any) {
      toast({
        title: t('message.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = async (nodeCodigo: string) => {
    // Load full node data and open edit dialog
    try {
      const { data: nodeData, error } = await supabase
        .from("nodos")
        .select(`
          *,
          panelistas:panelista_id (id, nombre_completo)
        `)
        .eq("codigo", nodeCodigo)
        .single();

      if (error) throw error;

      if (nodeData) {
        setSelectedNode({
          ...nodeData,
          panelista_nombre: nodeData.panelistas?.nombre_completo
        });
        setEditDialogOpen(true);
      }
    } catch (error: any) {
      toast({
        title: t('message.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
    setSelectedNode(null);
    // Reload the list after editing
    loadUnassignedNodes();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">
          <p className="text-muted-foreground">{t('message.loading')}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('unassigned_nodes.title')}</h1>
          <p className="text-muted-foreground">
            {t('unassigned_nodes.subtitle')}
          </p>
        </div>

        {unassignedNodes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('unassigned_nodes.all_assigned')}</h3>
                  <p className="text-muted-foreground">
                    {t('unassigned_nodes.no_unassigned')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('unassigned_nodes.filters_title')}</CardTitle>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="gap-2"
                    >
                      <X className="w-4 h-4" />
                      {t('unassigned_nodes.clear_filters')}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t('unassigned_nodes.search_placeholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('unassigned_nodes.status_all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('unassigned_nodes.status_all')}</SelectItem>
                      <SelectItem value="activo">{t('status.active')}</SelectItem>
                      <SelectItem value="inactivo">{t('status.inactive')}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Date From */}
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      placeholder={t('unassigned_nodes.date_from')}
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Date To */}
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      placeholder={t('unassigned_nodes.date_to')}
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Card */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {filteredNodes.length} {t('unassigned_nodes.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredNodes.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">{t('unassigned_nodes.no_results')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('label.node_code')}</TableHead>
                        <TableHead>{t('label.status')}</TableHead>
                        <TableHead>{t('label.region')}</TableHead>
                        <TableHead>{t('label.city')}</TableHead>
                        <TableHead>{t('label.country')}</TableHead>
                        <TableHead className="text-center">{t('unassigned_nodes.affected_events')}</TableHead>
                        <TableHead>{t('unassigned_nodes.first_event_date')}</TableHead>
                        <TableHead className="text-right">{t('label.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNodes.map((node) => (
                        <TableRow key={node.codigo}>
                          <TableCell>
                            <Button
                              variant="link"
                              className="p-0 h-auto font-mono font-semibold"
                              onClick={() => handleNodeClick(node.codigo)}
                            >
                              {node.codigo}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            {node.estado === "activo" ? (
                              <Badge variant="default" className="bg-success text-white">{t('status.active')}</Badge>
                            ) : (
                              <Badge variant="destructive">{t('status.inactive')}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {node.region_nombre || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>{node.ciudad_nombre || node.ciudad}</TableCell>
                          <TableCell>{node.pais}</TableCell>
                          <TableCell className="text-center">
                            {node.affectedEventsCount > 0 ? (
                              <Badge variant={node.affectedEventsCount > 10 ? "destructive" : "secondary"}>
                                {node.affectedEventsCount}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {node.firstEventDate ? (
                              <span className="font-medium">
                                {format(new Date(node.firstEventDate), "dd MMM yyyy")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNodeClick(node.codigo)}
                            >
                              {t('unassigned_nodes.assign_panelist')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Edit Node Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('unassigned_nodes.edit_node_title')}</DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <NodoForm
              initialData={selectedNode}
              onSuccess={() => {
                toast({ title: t('message.success'), description: t('nodos.updated_successfully') });
                handleDialogClose();
              }}
              onCancel={handleDialogClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
