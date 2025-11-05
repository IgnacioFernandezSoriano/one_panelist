import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
          region:regiones(nombre),
          ciudad_info:ciudades(nombre)
        `)
        .in('codigo', nodeCodes);

      if (nodosError) throw nodosError;

      // Fetch panelistas information
      const panelistaIds = nodos
        ?.filter(n => n.panelista_id)
        .map(n => n.panelista_id) || [];

      const { data: panelistas, error: panelistasError } = await supabase
        .from('panelistas')
        .select('id, nombre_completo')
        .in('id', panelistaIds);

      if (panelistasError) throw panelistasError;

      // Create a map for quick panelista lookup
      const panelistasMap = new Map(
        panelistas?.map(p => [p.id, p.nombre_completo]) || []
      );

      // Fetch all scheduled leaves

      const { data: leaves, error: leavesError } = await supabase
        .from('scheduled_leaves')
        .select('*')
        .in('panelista_id', panelistaIds)
        .in('status', ['scheduled', 'active']);

      if (leavesError) throw leavesError;

      // Create a map of nodos for quick lookup
      const nodosMap = new Map(nodos?.map(n => [n.codigo, n]) || []);

      // Helper function to check if a node has available panelist on a specific date
      const hasAvailablePanelist = (nodoCodigo: string, eventDate: Date): { available: boolean; reason?: string; leaveInfo?: any } => {
        const nodo = nodosMap.get(nodoCodigo);
        if (!nodo) return { available: false, reason: 'sin_panelista' };
        if (!nodo.panelista_id) return { available: false, reason: 'sin_panelista' };

        // Check if panelist is on leave on this date
        const panelistLeaves = leaves?.filter(l => l.panelista_id === nodo.panelista_id) || [];
        for (const leave of panelistLeaves) {
          const leaveStart = new Date(leave.leave_start_date);
          const leaveEnd = new Date(leave.leave_end_date);
          if (eventDate >= leaveStart && eventDate <= leaveEnd) {
            return {
              available: false,
              reason: 'panelista_de_baja',
              leaveInfo: {
                leave_start_date: leave.leave_start_date,
                leave_end_date: leave.leave_end_date,
                reason: leave.reason,
              }
            };
          }
        }

        return { available: true };
      };

      // Process risks by checking both origin and destination nodes for each event
      const risksMap = new Map<string, NodeRisk>();

      events?.forEach(event => {
        const eventDate = new Date(event.fecha_programada);
        
        // Check origin node
        const origenCheck = hasAvailablePanelist(event.nodo_origen, eventDate);
        // Check destination node
        const destinoCheck = hasAvailablePanelist(event.nodo_destino, eventDate);

        // Process origin node if it has issues
        if (!origenCheck.available) {
          const nodo = nodosMap.get(event.nodo_origen);
          if (nodo) {
            const key = `${nodo.codigo}-${origenCheck.reason}`;
            const existing = risksMap.get(key);

            if (existing) {
              existing.affected_events_count++;
              if (event.producto) {
                const productoExists = existing.productos.find(p => p.id === event.producto.id);
                if (!productoExists) {
                  existing.productos.push({ id: event.producto.id, nombre: event.producto.nombre_producto });
                }
              }
              if (event.carrier) {
                const carrierExists = existing.carriers.find(c => c.id === event.carrier.id);
                if (!carrierExists) {
                  existing.carriers.push({ id: event.carrier.id, nombre: event.carrier.legal_name });
                }
              }
              if (new Date(event.fecha_programada) < new Date(existing.first_event_date)) {
                existing.first_event_date = event.fecha_programada;
              }
              if (new Date(event.fecha_programada) > new Date(existing.last_event_date)) {
                existing.last_event_date = event.fecha_programada;
              }
            } else {
              risksMap.set(key, {
                nodo_codigo: nodo.codigo,
                ciudad: nodo.ciudad_info?.nombre || nodo.ciudad,
                region_nombre: nodo.region?.nombre || null,
                pais: nodo.pais,
                panelista_id: nodo.panelista_id,
                panelista_nombre: nodo.panelista_id ? panelistasMap.get(nodo.panelista_id) || null : null,
                risk_type: origenCheck.reason as 'sin_panelista' | 'panelista_de_baja',
                affected_events_count: 1,
                first_event_date: event.fecha_programada,
                last_event_date: event.fecha_programada,
                productos: event.producto ? [{ id: event.producto.id, nombre: event.producto.nombre_producto }] : [],
                carriers: event.carrier ? [{ id: event.carrier.id, nombre: event.carrier.legal_name }] : [],
                leave_info: origenCheck.leaveInfo,
              });
            }
          }
        }

        // Process destination node if it has issues
        if (!destinoCheck.available) {
          const nodo = nodosMap.get(event.nodo_destino);
          if (nodo) {
            const key = `${nodo.codigo}-${destinoCheck.reason}`;
            const existing = risksMap.get(key);

            if (existing) {
              existing.affected_events_count++;
              if (event.producto) {
                const productoExists = existing.productos.find(p => p.id === event.producto.id);
                if (!productoExists) {
                  existing.productos.push({ id: event.producto.id, nombre: event.producto.nombre_producto });
                }
              }
              if (event.carrier) {
                const carrierExists = existing.carriers.find(c => c.id === event.carrier.id);
                if (!carrierExists) {
                  existing.carriers.push({ id: event.carrier.id, nombre: event.carrier.legal_name });
                }
              }
              if (new Date(event.fecha_programada) < new Date(existing.first_event_date)) {
                existing.first_event_date = event.fecha_programada;
              }
              if (new Date(event.fecha_programada) > new Date(existing.last_event_date)) {
                existing.last_event_date = event.fecha_programada;
              }
            } else {
              risksMap.set(key, {
                nodo_codigo: nodo.codigo,
                ciudad: nodo.ciudad_info?.nombre || nodo.ciudad,
                region_nombre: nodo.region?.nombre || null,
                pais: nodo.pais,
                panelista_id: nodo.panelista_id,
                panelista_nombre: nodo.panelista_id ? panelistasMap.get(nodo.panelista_id) || null : null,
                risk_type: destinoCheck.reason as 'sin_panelista' | 'panelista_de_baja',
                affected_events_count: 1,
                first_event_date: event.fecha_programada,
                last_event_date: event.fecha_programada,
                productos: event.producto ? [{ id: event.producto.id, nombre: event.producto.nombre_producto }] : [],
                carriers: event.carrier ? [{ id: event.carrier.id, nombre: event.carrier.legal_name }] : [],
                leave_info: destinoCheck.leaveInfo,
              });
            }
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/issues/nodos-descubiertos/${risk.nodo_codigo}`)}
                    >
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
