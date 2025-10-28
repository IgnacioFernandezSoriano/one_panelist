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
        title: "Error loading unassigned nodes",
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
        title: "Error loading node",
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
          <p className="text-muted-foreground">Loading unassigned nodes...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Nodes Without Assigned Panelist</h1>
          <p className="text-muted-foreground">
            Nodes that don't have a panelist assigned and their impact on the allocation plan
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
                  <h3 className="text-lg font-semibold mb-2">All nodes have assigned panelists</h3>
                  <p className="text-muted-foreground">
                    Great! There are no nodes without a panelist assignment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                {unassignedNodes.length} Node{unassignedNodes.length !== 1 ? "s" : ""} Without Panelist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Node Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-center">Affected Events</TableHead>
                    <TableHead>First Event Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                          <Badge variant="default" className="bg-success text-white">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
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
                          Assign Panelist
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
            <DialogTitle>Edit Node - Assign Panelist</DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <NodoForm
              initialData={selectedNode}
              onSuccess={() => {
                toast({ title: "Node updated successfully" });
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
