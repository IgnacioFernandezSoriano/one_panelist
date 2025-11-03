import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Search, UserX, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface NodeRisk {
  nodo_codigo: string;
  ciudad: string;
  region_nombre: string | null;
  pais: string;
  panelista_id: number | null;
  panelista_nombre: string | null;
  risk_type: 'sin_panelista' | 'panelista_de_baja';
  affected_events_count: number;
  first_event_date: string;
  last_event_date: string;
  productos: Array<{id: number, nombre: string}>;
  carriers: Array<{id: number, nombre: string}>;
  leave_info?: {
    leave_start_date: string;
    leave_end_date: string;
    reason: string | null;
  };
}

const NodosDescubiertos = () => {
  const [risks, setRisks] = useState<NodeRisk[]>([]);
  const [filteredRisks, setFilteredRisks] = useState<NodeRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskTypeFilter, setRiskTypeFilter] = useState<string>("all");
  const { toast } = useToast();

  // Statistics
  const totalNodesAtRisk = filteredRisks.length;
  const totalAffectedEvents = filteredRisks.reduce((sum, risk) => sum + risk.affected_events_count, 0);
  const sinPanelistaCount = filteredRisks.filter(r => r.risk_type === 'sin_panelista').length;
  const panelistaBajaCount = filteredRisks.filter(r => r.risk_type === 'panelista_de_baja').length;

  useEffect(() => {
    loadNodeRisks();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [risks, searchTerm, riskTypeFilter]);

  const applyFilters = () => {
    let filtered = [...risks];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(risk => 
        risk.nodo_codigo.toLowerCase().includes(search) ||
        risk.ciudad.toLowerCase().includes(search) ||
        risk.pais.toLowerCase().includes(search) ||
        risk.region_nombre?.toLowerCase().includes(search)
      );
    }

    // Risk type filter
    if (riskTypeFilter !== "all") {
      filtered = filtered.filter(risk => risk.risk_type === riskTypeFilter);
    }

    setFilteredRisks(filtered);
  };

  const loadNodeRisks = async () => {
    try {
      setLoading(true);

      // Get all active allocation plan events
      const { data: events, error: eventsError } = await supabase
        .from('generated_allocation_plan_details')
        .select(`
          *,
          plan:generated_allocation_plans!inner(status),
          producto:productos_cliente(id, nombre_producto),
          carrier:carriers(id, legal_name)
        `)
        .in('plan.status', ['draft', 'merged']);

      if (eventsError) throw eventsError;

      if (!events || events.length === 0) {
        setRisks([]);
        return;
      }

      // Get all unique node codes from events
      const nodeCodesSet = new Set<string>();
      events.forEach(event => {
        nodeCodesSet.add(event.nodo_origen);
        nodeCodesSet.add(event.nodo_destino);
      });

      const nodeCodes = Array.from(nodeCodesSet);

      // Fetch node information
      const { data: nodos, error: nodosError } = await supabase
        .from('nodos')
        .select(`
          codigo,
          ciudad,
          pais,
          panelista_id,
          panelista:panelistas(id, nombre_completo),
          region:regiones(nombre),
          ciudad_info:ciudades(nombre)
        `)
        .in('codigo', nodeCodes);

      if (nodosError) throw nodosError;

      // Fetch all scheduled leaves
      const panelistaIds = nodos
        ?.filter(n => n.panelista_id)
        .map(n => n.panelista_id) || [];

      const { data: leaves, error: leavesError } = await supabase
        .from('scheduled_leaves')
        .select('*')
        .in('panelista_id', panelistaIds)
        .in('status', ['scheduled', 'active']);

      if (leavesError) throw leavesError;

      // Process risks
      const risksMap = new Map<string, NodeRisk>();

      nodos?.forEach(nodo => {
        const nodeEvents = events.filter(e => 
          e.nodo_origen === nodo.codigo || e.nodo_destino === nodo.codigo
        );

        if (nodeEvents.length === 0) return;

        let riskType: 'sin_panelista' | 'panelista_de_baja' | null = null;
        let leaveInfo = undefined;

        // Check if node has no panelist
        if (!nodo.panelista_id) {
          riskType = 'sin_panelista';
        } else {
          // Check if panelist has conflicting leaves
          const panelistLeaves = leaves?.filter(l => l.panelista_id === nodo.panelista_id) || [];
          
          // Check if any event date falls within a leave period
          for (const event of nodeEvents) {
            const eventDate = new Date(event.fecha_programada);
            for (const leave of panelistLeaves) {
              const leaveStart = new Date(leave.leave_start_date);
              const leaveEnd = new Date(leave.leave_end_date);
              
              if (eventDate >= leaveStart && eventDate <= leaveEnd) {
                riskType = 'panelista_de_baja';
                leaveInfo = {
                  leave_start_date: leave.leave_start_date,
                  leave_end_date: leave.leave_end_date,
                  reason: leave.reason,
                };
                break;
              }
            }
            if (riskType === 'panelista_de_baja') break;
          }
        }

        // Only add if there's a risk
        if (riskType) {
          const affectedEvents = nodeEvents.filter(e => {
            if (riskType === 'sin_panelista') return true;
            if (riskType === 'panelista_de_baja' && leaveInfo) {
              const eventDate = new Date(e.fecha_programada);
              const leaveStart = new Date(leaveInfo.leave_start_date);
              const leaveEnd = new Date(leaveInfo.leave_end_date);
              return eventDate >= leaveStart && eventDate <= leaveEnd;
            }
            return false;
          });

          if (affectedEvents.length > 0) {
            const sortedEvents = affectedEvents.sort((a, b) => 
              new Date(a.fecha_programada).getTime() - new Date(b.fecha_programada).getTime()
            );

            // Get unique productos and carriers
            const productosMap = new Map();
            const carriersMap = new Map();
            
            affectedEvents.forEach(event => {
              if (event.producto) {
                productosMap.set(event.producto.id, event.producto.nombre_producto);
              }
              if (event.carrier) {
                carriersMap.set(event.carrier.id, event.carrier.legal_name);
              }
            });

            risksMap.set(nodo.codigo, {
              nodo_codigo: nodo.codigo,
              ciudad: nodo.ciudad_info?.nombre || nodo.ciudad,
              region_nombre: nodo.region?.nombre || null,
              pais: nodo.pais,
              panelista_id: nodo.panelista_id,
              panelista_nombre: nodo.panelista?.nombre_completo || null,
              risk_type: riskType,
              affected_events_count: affectedEvents.length,
              first_event_date: sortedEvents[0].fecha_programada,
              last_event_date: sortedEvents[sortedEvents.length - 1].fecha_programada,
              productos: Array.from(productosMap.entries()).map(([id, nombre]) => ({ id, nombre })),
              carriers: Array.from(carriersMap.entries()).map(([id, nombre]) => ({ id, nombre })),
              leave_info: leaveInfo,
            });
          }
        }
      });

      setRisks(Array.from(risksMap.values()));
    } catch (error: any) {
      console.error('Error loading node risks:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los nodos en riesgo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (riskType: string) => {
    if (riskType === 'sin_panelista') {
      return (
        <Badge variant="destructive" className="whitespace-nowrap">
          <UserX className="w-3 h-3 mr-1" />
          Sin Panelista
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white whitespace-nowrap">
          <Calendar className="w-3 h-3 mr-1" />
          Panelista de Baja
        </Badge>
      );
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Nodos Descubiertos</h1>
          <p className="text-muted-foreground">
            Nodos con eventos del plan de asignación sin cobertura de panelista
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Nodos en Riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalNodesAtRisk}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Eventos Afectados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAffectedEvents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Sin Panelista</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{sinPanelistaCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Panelista de Baja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{panelistaBajaCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código de nodo, ciudad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={riskTypeFilter} onValueChange={setRiskTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Riesgo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Riesgos</SelectItem>
                  <SelectItem value="sin_panelista">Sin Panelista</SelectItem>
                  <SelectItem value="panelista_de_baja">Panelista de Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Nodos en Riesgo</CardTitle>
            <CardDescription>
              {filteredRisks.length} {filteredRisks.length === 1 ? 'nodo encontrado' : 'nodos encontrados'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredRisks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No se encontraron nodos en riesgo</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nodo</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Panelista</TableHead>
                      <TableHead>Tipo de Riesgo</TableHead>
                      <TableHead className="text-center">Eventos</TableHead>
                      <TableHead>Fechas</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead>Carriers</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRisks.map((risk) => (
                      <TableRow key={risk.nodo_codigo}>
                        <TableCell className="font-medium">{risk.nodo_codigo}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{risk.ciudad}</div>
                            {risk.region_nombre && (
                              <div className="text-xs text-muted-foreground">{risk.region_nombre}</div>
                            )}
                            <div className="text-xs text-muted-foreground">{risk.pais}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {risk.panelista_nombre ? (
                            <div>
                              <div>{risk.panelista_nombre}</div>
                              {risk.leave_info && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Baja: {format(new Date(risk.leave_info.leave_start_date), 'dd/MM/yy')} - {format(new Date(risk.leave_info.leave_end_date), 'dd/MM/yy')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getRiskBadge(risk.risk_type)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{risk.affected_events_count}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{format(new Date(risk.first_event_date), 'dd/MM/yyyy')}</div>
                            {risk.first_event_date !== risk.last_event_date && (
                              <div className="text-muted-foreground">
                                {format(new Date(risk.last_event_date), 'dd/MM/yyyy')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {risk.productos.slice(0, 2).map((p) => (
                              <Badge key={p.id} variant="secondary" className="text-xs">
                                {p.nombre}
                              </Badge>
                            ))}
                            {risk.productos.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{risk.productos.length - 2} más
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {risk.carriers.slice(0, 2).map((c) => (
                              <Badge key={c.id} variant="outline" className="text-xs">
                                {c.nombre}
                              </Badge>
                            ))}
                            {risk.carriers.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{risk.carriers.length - 2} más
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Ver Detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NodosDescubiertos;
