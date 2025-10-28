import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface UnassignedNode {
  codigo: string;
  ciudad: string;
  pais: string;
  region_id: number | null;
  ciudad_id: number | null;
  affectedEventsCount: number;
  firstEventDate: string | null;
}

export default function UnassignedNodes() {
  const [unassignedNodes, setUnassignedNodes] = useState<UnassignedNode[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadUnassignedNodes();
  }, []);

  const loadUnassignedNodes = async () => {
    setLoading(true);
    try {
      // Get all nodes without assigned panelist
      const { data: nodesData, error: nodesError } = await supabase
        .from("nodos")
        .select("codigo, ciudad, pais, region_id, ciudad_id")
        .is("panelista_id", null)
        .eq("estado", "activo")
        .order("codigo");

      if (nodesError) throw nodesError;

      if (!nodesData || nodesData.length === 0) {
        setUnassignedNodes([]);
        setLoading(false);
        return;
      }

      // For each node, get the count of affected events and first event date
      const nodesWithStats = await Promise.all(
        nodesData.map(async (node) => {
          // Count events where this node is origin or destination
          const { data: enviosData, error: enviosError } = await supabase
            .from("envios")
            .select("fecha_programada")
            .or(`nodo_origen.eq.${node.codigo},nodo_destino.eq.${node.codigo}`)
            .order("fecha_programada", { ascending: true });

          if (enviosError) {
            console.error("Error fetching envios for node:", node.codigo, enviosError);
            return {
              ...node,
              affectedEventsCount: 0,
              firstEventDate: null,
            };
          }

          return {
            ...node,
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

  const handleNodeClick = (nodeCodigo: string) => {
    // Navigate to nodes configuration page with filter or highlight
    navigate(`/configuracion/nodos?codigo=${nodeCodigo}`);
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
                    Great! There are no active nodes without a panelist assignment.
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
                      <TableCell>{node.ciudad}</TableCell>
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
    </AppLayout>
  );
}
