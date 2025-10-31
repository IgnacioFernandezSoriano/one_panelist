import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, MapPin, Calendar, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Papa from "papaparse";

interface PlanDetailsDialogProps {
  planId: number | null;
  open: boolean;
  onClose: () => void;
}

interface PlanDetail {
  id: number;
  nodo_origen: string;
  nodo_destino: string;
  fecha_programada: string;
  ciudad_origen: string;
  ciudad_destino: string;
  clasificacion: string;
}

interface PlanInfo {
  carrier_name: string;
  product_name: string;
  start_date: string;
  end_date: string;
  total_events: number;
}

export function PlanDetailsDialog({ planId, open, onClose }: PlanDetailsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<PlanDetail[]>([]);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [stats, setStats] = useState({
    totalEvents: 0,
    avgEventsPerWeek: 0,
    uniqueCities: 0,
    classifications: { A: 0, B: 0, C: 0 },
  });

  useEffect(() => {
    if (open && planId) {
      loadPlanDetails();
    }
  }, [open, planId]);

  const loadPlanDetails = async () => {
    if (!planId) return;

    setLoading(true);
    try {
      // Load plan info
      const { data: plan, error: planError } = await supabase
        .from('generated_allocation_plans' as any)
        .select(`
          *,
          carriers (commercial_name),
          productos_cliente (codigo_producto, nombre_producto)
        `)
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      setPlanInfo({
        carrier_name: (plan as any).carriers.commercial_name,
        product_name: (plan as any).productos_cliente.nombre_producto,
        start_date: (plan as any).start_date,
        end_date: (plan as any).end_date,
        total_events: (plan as any).calculated_events || (plan as any).total_events || 0,
      });

      // Load plan details with enriched data
      const { data: detailsData, error: detailsError } = await supabase
        .from('generated_allocation_plan_details' as any)
        .select('*')
        .eq('plan_id', planId)
        .order('fecha_programada', { ascending: true });

      if (detailsError) throw detailsError;

      // Get all unique node codes
      const nodeCodes = new Set<string>();
      detailsData?.forEach((d: any) => {
        nodeCodes.add(d.nodo_origen);
        nodeCodes.add(d.nodo_destino);
      });

      // Load node and city information
      const { data: nodos } = await supabase
        .from('nodos')
        .select(`
          codigo,
          ciudad_id,
          ciudades (nombre, clasificacion)
        `)
        .in('codigo', Array.from(nodeCodes));

      // Create a map for quick lookup
      const nodeMap = new Map();
      nodos?.forEach((n: any) => {
        nodeMap.set(n.codigo, {
          ciudad: n.ciudades?.nombre || 'Unknown',
          clasificacion: n.ciudades?.clasificacion || 'N/A',
        });
      });

      // Enrich details with city and classification data
      const enrichedDetails: PlanDetail[] = (detailsData || []).map((d: any) => ({
        id: d.id,
        nodo_origen: d.nodo_origen,
        nodo_destino: d.nodo_destino,
        fecha_programada: d.fecha_programada,
        ciudad_origen: nodeMap.get(d.nodo_origen)?.ciudad || 'Unknown',
        ciudad_destino: nodeMap.get(d.nodo_destino)?.ciudad || 'Unknown',
        clasificacion: nodeMap.get(d.nodo_destino)?.clasificacion || 'N/A',
      }));

      setDetails(enrichedDetails);

      // Calculate stats
      const uniqueCities = new Set(enrichedDetails.map(d => d.ciudad_destino));
      const classificationCounts = enrichedDetails.reduce(
        (acc, d) => {
          if (d.clasificacion === 'A') acc.A++;
          else if (d.clasificacion === 'B') acc.B++;
          else if (d.clasificacion === 'C') acc.C++;
          return acc;
        },
        { A: 0, B: 0, C: 0 }
      );

      const weeks = Math.ceil(
        (new Date((plan as any).end_date).getTime() - new Date((plan as any).start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)
      );

      setStats({
        totalEvents: enrichedDetails.length,
        avgEventsPerWeek: Math.round(enrichedDetails.length / (weeks || 1)),
        uniqueCities: uniqueCities.size,
        classifications: classificationCounts,
      });
    } catch (error: any) {
      console.error("Error loading plan details:", error);
      toast({
        title: "Error loading details",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportDetails = () => {
    const csv = Papa.unparse(
      details.map((d) => ({
        fecha_programada: d.fecha_programada,
        nodo_origen: d.nodo_origen,
        ciudad_origen: d.ciudad_origen,
        nodo_destino: d.nodo_destino,
        ciudad_destino: d.ciudad_destino,
        clasificacion: d.clasificacion,
      }))
    );

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan_details_${planId}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported successfully",
      description: "Plan details exported to CSV",
    });
  };

  // Group details by date
  const detailsByDate = details.reduce((acc, detail) => {
    const date = detail.fecha_programada;
    if (!acc[date]) acc[date] = [];
    acc[date].push(detail);
    return acc;
  }, {} as Record<string, PlanDetail[]>);

  // Group details by city
  const detailsByCity = details.reduce((acc, detail) => {
    const city = detail.ciudad_destino;
    if (!acc[city]) acc[city] = [];
    acc[city].push(detail);
    return acc;
  }, {} as Record<string, PlanDetail[]>);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Plan Details</span>
            {planInfo && (
              <Badge variant="outline" className="text-sm font-normal">
                {planInfo.carrier_name} - {planInfo.product_name}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {planInfo && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(planInfo.start_date), "MMM dd, yyyy")} -{" "}
                    {format(new Date(planInfo.end_date), "MMM dd, yyyy")}
                  </span>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Events</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold">{stats.avgEventsPerWeek}</div>
                    <div className="text-sm text-muted-foreground">Events/Week</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold">{stats.uniqueCities}</div>
                    <div className="text-sm text-muted-foreground">Cities</div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">A: {stats.classifications.A}</Badge>
                      <Badge variant="secondary">B: {stats.classifications.B}</Badge>
                      <Badge variant="secondary">C: {stats.classifications.C}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Classifications</div>
                  </Card>
                </div>

                {/* Tabs for different views */}
                <Tabs defaultValue="list" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="list">Events List</TabsTrigger>
                    <TabsTrigger value="by-date">By Date</TabsTrigger>
                    <TabsTrigger value="by-city">By City</TabsTrigger>
                  </TabsList>

                  <TabsContent value="list" className="mt-4">
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Origin</TableHead>
                            <TableHead>Origin City</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Dest. City</TableHead>
                            <TableHead>Class.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {details.map((detail) => (
                            <TableRow key={detail.id}>
                              <TableCell>{format(new Date(detail.fecha_programada), "MMM dd")}</TableCell>
                              <TableCell className="font-mono text-xs">{detail.nodo_origen}</TableCell>
                              <TableCell>{detail.ciudad_origen}</TableCell>
                              <TableCell className="font-mono text-xs">{detail.nodo_destino}</TableCell>
                              <TableCell>{detail.ciudad_destino}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{detail.clasificacion}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="by-date" className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                    {Object.entries(detailsByDate).map(([date, dateDetails]) => (
                      <Card key={date} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{format(new Date(date), "MMMM dd, yyyy")}</span>
                          </div>
                          <Badge variant="secondary">{dateDetails.length} events</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Cities: {new Set(dateDetails.map(d => d.ciudad_destino)).size} unique
                        </div>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="by-city" className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                    {Object.entries(detailsByCity)
                      .sort((a, b) => b[1].length - a[1].length)
                      .map(([city, cityDetails]) => {
                        const classCount = cityDetails.reduce(
                          (acc, d) => {
                            if (d.clasificacion === 'A') acc.A++;
                            else if (d.clasificacion === 'B') acc.B++;
                            else if (d.clasificacion === 'C') acc.C++;
                            return acc;
                          },
                          { A: 0, B: 0, C: 0 }
                        );

                        return (
                          <Card key={city} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold">{city}</span>
                              </div>
                              <Badge variant="secondary">{cityDetails.length} events</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              {classCount.A > 0 && <Badge variant="outline">A: {classCount.A}</Badge>}
                              {classCount.B > 0 && <Badge variant="outline">B: {classCount.B}</Badge>}
                              {classCount.C > 0 && <Badge variant="outline">C: {classCount.C}</Badge>}
                            </div>
                          </Card>
                        );
                      })}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </>
        )}

        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportDetails} disabled={loading || details.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
