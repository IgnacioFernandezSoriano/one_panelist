import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, ExternalLink } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUnassignedNodes();
  }, []);

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
          <Card>
            <CardHeader>
              <CardTitle>
                {unassignedNodes.length} {t('unassigned_nodes.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  {unassignedNodes.map((node) => (
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
            </CardContent>
          </Card>
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
