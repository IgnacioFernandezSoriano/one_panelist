import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Calendar, Package } from "lucide-react";
import { format } from "date-fns";
import { useCliente } from "@/contexts/ClienteContext";

interface PanelistMaterials {
  panelista_id: number | null;
  panelista_nombre: string;
  nodo_codigo: string;
  direccion_completa: string;
  total_eventos: number;
  materiales: Record<string, {
    cantidad: number;
    unidad_medida: string;
  }>;
}

export default function PanelistMaterialsPlan() {
  const { clienteId } = useCliente();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<PanelistMaterials[]>([]);
  const [totals, setTotals] = useState<Record<string, { cantidad: number; unidad_medida: string }>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    if (!clienteId) {
      toast({
        title: "No client selected",
        description: "Please select a client from the dropdown",
        variant: "destructive",
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log("Loading materials for client:", clienteId, "from", startDate, "to", endDate);

      // Step 1: Get all events in the date range with product materials
      const { data: eventos, error: eventosError } = await supabase
        .from("generated_allocation_plan_details")
        .select(`
          id,
          nodo_destino,
          producto_id,
          productos_cliente!inner (
            id,
            nombre_producto,
            producto_materiales (
              cantidad,
              tipos_material (
                codigo,
                nombre,
                unidad_medida
              )
            )
          )
        `)
        .eq("cliente_id", clienteId)
        .gte("fecha_programada", startDate)
        .lte("fecha_programada", endDate)
        .in("status", ["PENDING", "NOTIFIED"])
        .not("producto_id", "is", null);

      if (eventosError) {
        console.error("Error fetching eventos:", eventosError);
        throw eventosError;
      }

      console.log("Found eventos:", eventos?.length);

      if (!eventos || eventos.length === 0) {
        setData([]);
        setTotals({});
        toast({
          title: "No events found",
          description: "No events found in the selected date range",
        });
        setLoading(false);
        return;
      }

      // Step 2: Get unique nodo codes
      const nodoCodigos = [...new Set(eventos.map(e => e.nodo_destino).filter(Boolean))];
      console.log("Unique nodos:", nodoCodigos.length);

      // Step 3: Get nodos with panelist info
      const { data: nodos, error: nodosError } = await supabase
        .from("nodos")
        .select(`
          codigo,
          panelista_id,
          ciudad,
          pais
        `)
        .in("codigo", nodoCodigos);

      if (nodosError) {
        console.error("Error fetching nodos:", nodosError);
        throw nodosError;
      }

      console.log("Found nodos:", nodos?.length);

      // Step 4: Get panelistas info for assigned nodes
      const panelistaIds = nodos?.filter(n => n.panelista_id).map(n => n.panelista_id) || [];
      let panelistas: any[] = [];
      
      if (panelistaIds.length > 0) {
        const { data: panelistasData, error: panelistasError } = await supabase
          .from("panelistas")
          .select(`
            id,
            nombre_completo,
            direccion_calle,
            direccion_ciudad,
            direccion_codigo_postal,
            direccion_pais
          `)
          .in("id", panelistaIds);

        if (panelistasError) {
          console.error("Error fetching panelistas:", panelistasError);
          throw panelistasError;
        }

        panelistas = panelistasData || [];
        console.log("Found panelistas:", panelistas.length);
      }

      // Step 5: Create lookup maps
      const nodoMap = new Map(nodos?.map(n => [n.codigo, n]) || []);
      const panelistaMap = new Map(panelistas.map(p => [p.id, p]));

      // Step 6: Group events by panelist/node and calculate materials
      const grouped = new Map<string, PanelistMaterials>();

      eventos.forEach((evento: any) => {
        const nodo = nodoMap.get(evento.nodo_destino);
        if (!nodo) return;

        let groupKey: string;
        let groupData: PanelistMaterials;

        if (nodo.panelista_id) {
          // Node has assigned panelist
          const panelista = panelistaMap.get(nodo.panelista_id);
          groupKey = `panelist-${nodo.panelista_id}`;
          
          if (!grouped.has(groupKey)) {
            grouped.set(groupKey, {
              panelista_id: nodo.panelista_id,
              panelista_nombre: panelista?.nombre_completo || `Panelist ${nodo.panelista_id}`,
              nodo_codigo: nodo.codigo,
              direccion_completa: panelista 
                ? `${panelista.direccion_calle}, ${panelista.direccion_ciudad}, ${panelista.direccion_codigo_postal}, ${panelista.direccion_pais}`
                : `${nodo.ciudad}, ${nodo.pais}`,
              total_eventos: 0,
              materiales: {},
            });
          }
        } else {
          // Node without panelist
          groupKey = `node-${nodo.codigo}`;
          
          if (!grouped.has(groupKey)) {
            grouped.set(groupKey, {
              panelista_id: null,
              panelista_nombre: `Unassigned Node: ${nodo.codigo}`,
              nodo_codigo: nodo.codigo,
              direccion_completa: `${nodo.ciudad}, ${nodo.pais}`,
              total_eventos: 0,
              materiales: {},
            });
          }
        }

        const group = grouped.get(groupKey)!;
        group.total_eventos += 1;

        // Add materials from this event
        if (evento.productos_cliente?.producto_materiales) {
          evento.productos_cliente.producto_materiales.forEach((pm: any) => {
            const material = pm.tipos_material;
            if (!material) return;

            const materialKey = `${material.codigo} - ${material.nombre}`;
            if (!group.materiales[materialKey]) {
              group.materiales[materialKey] = {
                cantidad: 0,
                unidad_medida: material.unidad_medida,
              };
            }
            group.materiales[materialKey].cantidad += pm.cantidad;
          });
        }
      });

      // Step 7: Calculate totals
      const totalMaterials: Record<string, { cantidad: number; unidad_medida: string }> = {};
      grouped.forEach(group => {
        Object.entries(group.materiales).forEach(([material, info]) => {
          if (!totalMaterials[material]) {
            totalMaterials[material] = { cantidad: 0, unidad_medida: info.unidad_medida };
          }
          totalMaterials[material].cantidad += info.cantidad;
        });
      });

      const result = Array.from(grouped.values()).sort((a, b) => 
        a.panelista_nombre.localeCompare(b.panelista_nombre)
      );

      setData(result);
      setTotals(totalMaterials);
      
      toast({
        title: "Data loaded successfully",
        description: `Found ${result.length} recipients with ${eventos.length} total events`,
      });
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) {
      toast({
        title: "No data to export",
        description: "Please load data first",
        variant: "destructive",
      });
      return;
    }

    const rows: string[] = [];
    
    // Header
    rows.push("Recipient,Node Code,Address,Total Events,Material,Quantity,Unit");

    // Data rows
    data.forEach(item => {
      const materialsEntries = Object.entries(item.materiales);
      if (materialsEntries.length === 0) {
        rows.push(`"${item.panelista_nombre}","${item.nodo_codigo}","${item.direccion_completa}",${item.total_eventos},"No materials",0,""`);
      } else {
        materialsEntries.forEach(([material, info]) => {
          rows.push(`"${item.panelista_nombre}","${item.nodo_codigo}","${item.direccion_completa}",${item.total_eventos},"${material}",${info.cantidad},"${info.unidad_medida}"`);
        });
      }
    });

    // Totals
    rows.push("");
    rows.push("TOTALS");
    Object.entries(totals).forEach(([material, info]) => {
      rows.push(`"","","","","${material}",${info.cantidad},"${info.unidad_medida}"`);
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `materials-plan-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Materials plan exported to CSV",
    });
  };

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Package className="h-8 w-8" />
            Panelist Materials Plan
          </h1>
          <p className="text-muted-foreground">
            Calculate materials needed per panelist for pending and notified events (not yet sent)
          </p>
        </div>

        {/* Date Range Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Range Filter
            </CardTitle>
            <CardDescription>
              Select date range to calculate materials for events not yet sent (PENDING and NOTIFIED status)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={loadData}
                  disabled={loading || !clienteId}
                  className="flex-1"
                >
                  {loading ? "Loading..." : "Load Data"}
                </Button>
                <Button
                  variant="outline"
                  onClick={exportToCSV}
                  disabled={data.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {data.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center text-muted-foreground">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">Select date range and click "Load Data" to see materials plan</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Total Materials Required</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(totals).map(([material, info]) => (
                    <div key={material} className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground">{material}</div>
                      <div className="text-2xl font-bold">
                        {info.cantidad} {info.unidad_medida}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Details Table */}
            <Card>
              <CardHeader>
                <CardTitle>Materials by Recipient</CardTitle>
                <CardDescription>
                  Showing {data.length} recipients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Node Code</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Total Events</TableHead>
                      <TableHead>Materials</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {item.panelista_nombre}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.nodo_codigo}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.direccion_completa}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.total_eventos}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {Object.entries(item.materiales).length === 0 ? (
                              <span className="text-sm text-muted-foreground">No materials</span>
                            ) : (
                              Object.entries(item.materiales).map(([material, info]) => (
                                <div key={material} className="text-sm">
                                  <span className="font-medium">{material}:</span>{" "}
                                  {info.cantidad} {info.unidad_medida}
                                </div>
                              ))
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
