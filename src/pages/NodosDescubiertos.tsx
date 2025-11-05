import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Search, UserX, Calendar, ChevronDown, ChevronRight, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AffectedEvent {
  id: number;
  fecha_programada: string;
  nodo_origen: string;
  nodo_destino: string;
  producto_nombre: string;
  carrier_nombre: string;
  status: string;
  plan_id: number;
  plan_name: string;
}

interface NodeRisk {
  nodo_codigo: string;
  ciudad: string;
  ciudad_id: number;
  region_nombre: string | null;
  region_id: number;
  clasificacion: string;
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
  
  // Expandible rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [eventsMap, setEventsMap] = useState<Map<string, AffectedEvent[]>>(new Map());
  const [loadingEvents, setLoadingEvents] = useState<Set<string>>(new Set());
  
  // Inline editing
  const [editingEvent, setEditingEvent] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<AffectedEvent>>({});
  const [availableNodes, setAvailableNodes] = useState<Array<{codigo: string, panelista_nombre: string | null}>>([]);

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
          ciudad_id,
          region_id,
          pais,
          panelista_id,
          region:regiones(id, nombre),
          ciudad_info:ciudades(id, nombre, clasificacion)
        `)
        .in('codigo', nodeCodes);

      if (nodosError) throw nodosError;

      // Fetch panelistas information from TWO sources:
      // 1. From nodos.panelista_id (if assigned)
      const panelistaIds = nodos
        ?.filter(n => n.panelista_id)
        .map(n => n.panelista_id) || [];

      const { data: panelistasByIds, error: panelistasByIdsError } = await supabase
        .from('panelistas')
        .select('id, nombre_completo')
        .in('id', panelistaIds);

      if (panelistasByIdsError) throw panelistasByIdsError;

      // 2. From panelistas.nodo_asignado (main source until event is sent)
      const { data: panelistasByNodo, error: panelistasByNodoError } = await supabase
        .from('panelistas')
        .select('id, nombre_completo, nodo_asignado')
        .in('nodo_asignado', nodeCodes);

      if (panelistasByNodoError) throw panelistasByNodoError;

      // Create maps for quick panelista lookup
      // Map by panelista ID
      const panelistasByIdMap = new Map(
        panelistasByIds?.map(p => [p.id, p.nombre_completo]) || []
      );
      
      // Map by nodo codigo
      const panelistasByNodoMap = new Map(
        panelistasByNodo?.map(p => [p.nodo_asignado, { id: p.id, nombre_completo: p.nombre_completo }]) || []
      );

      // Combine both sources: prioritize nodos.panelista_id, fallback to panelistas.nodo_asignado
      const panelistasMap = new Map();
      panelistasByIdMap.forEach((nombre, id) => panelistasMap.set(id, nombre));
      
      // Also collect all panelista IDs for leaves query
      const allPanelistaIds = new Set<number>();
      panelistaIds.forEach(id => allPanelistaIds.add(id));
      panelistasByNodo?.forEach(p => allPanelistaIds.add(p.id));

      // Fetch all scheduled leaves for all panelistas found
      const { data: leaves, error: leavesError } = await supabase
        .from('scheduled_leaves')
        .select('*')
        .in('panelista_id', Array.from(allPanelistaIds))
        .in('status', ['scheduled', 'active']);

      if (leavesError) throw leavesError;

      // Create a map of nodos for quick lookup
      const nodosMap = new Map(nodos?.map(n => [n.codigo, n]) || []);

      // Helper function to check if a node has available panelist on a specific date
      const hasAvailablePanelist = (nodoCodigo: string, eventDate: Date): { available: boolean; reason?: string; leaveInfo?: any; panelistaId?: number } => {
        const nodo = nodosMap.get(nodoCodigo);
        if (!nodo) return { available: false, reason: 'sin_panelista' };
        
        // Try to find panelista from TWO sources:
        // 1. From nodos.panelista_id (if event already sent)
        let panelistaId = nodo.panelista_id;
        
        // 2. From panelistas.nodo_asignado (before event is sent)
        if (!panelistaId) {
          const panelistaInfo = panelistasByNodoMap.get(nodoCodigo);
          if (panelistaInfo) {
            panelistaId = panelistaInfo.id;
          }
        }
        
        // If no panelista found in either source, node has no panelista
        if (!panelistaId) return { available: false, reason: 'sin_panelista' };

        // Check if panelist is on leave on this date
        const panelistLeaves = leaves?.filter(l => l.panelista_id === panelistaId) || [];
        for (const leave of panelistLeaves) {
          const leaveStart = new Date(leave.leave_start_date);
          const leaveEnd = new Date(leave.leave_end_date);
          if (eventDate >= leaveStart && eventDate <= leaveEnd) {
            return {
              available: false,
              reason: 'panelista_de_baja',
              panelistaId: panelistaId,
              leaveInfo: {
                leave_start_date: leave.leave_start_date,
                leave_end_date: leave.leave_end_date,
                reason: leave.reason,
              }
            };
          }
        }

        return { available: true, panelistaId: panelistaId };
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
              // Get panelista info from either source
              const panelistaId = origenCheck.panelistaId || nodo.panelista_id;
              let panelistaNombre = null;
              if (panelistaId) {
                panelistaNombre = panelistasMap.get(panelistaId);
                if (!panelistaNombre) {
                  const panelistaInfo = panelistasByNodoMap.get(nodo.codigo);
                  panelistaNombre = panelistaInfo?.nombre_completo || null;
                }
              }
              
              risksMap.set(key, {
                nodo_codigo: nodo.codigo,
                ciudad: nodo.ciudad_info?.nombre || nodo.ciudad,
                ciudad_id: nodo.ciudad_info?.id || nodo.ciudad_id || 0,
                region_nombre: nodo.region?.nombre || null,
                region_id: nodo.region?.id || nodo.region_id || 0,
                clasificacion: nodo.ciudad_info?.clasificacion || 'C',
                pais: nodo.pais,
                panelista_id: panelistaId,
                panelista_nombre: panelistaNombre,
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
              // Get panelista info from either source
              const panelistaId = destinoCheck.panelistaId || nodo.panelista_id;
              let panelistaNombre = null;
              if (panelistaId) {
                panelistaNombre = panelistasMap.get(panelistaId);
                if (!panelistaNombre) {
                  const panelistaInfo = panelistasByNodoMap.get(nodo.codigo);
                  panelistaNombre = panelistaInfo?.nombre_completo || null;
                }
              }
              
              risksMap.set(key, {
                nodo_codigo: nodo.codigo,
                ciudad: nodo.ciudad_info?.nombre || nodo.ciudad,
                ciudad_id: nodo.ciudad_info?.id || nodo.ciudad_id || 0,
                region_nombre: nodo.region?.nombre || null,
                region_id: nodo.region?.id || nodo.region_id || 0,
                clasificacion: nodo.ciudad_info?.clasificacion || 'C',
                pais: nodo.pais,
                panelista_id: panelistaId,
                panelista_nombre: panelistaNombre,
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

  const toggleRow = async (nodoCodigo: string, risk: NodeRisk) => {
    const newExpanded = new Set(expandedRows);
    
    if (newExpanded.has(nodoCodigo)) {
      newExpanded.delete(nodoCodigo);
      setExpandedRows(newExpanded);
    } else {
      newExpanded.add(nodoCodigo);
      setExpandedRows(newExpanded);
      
      // Load events if not already loaded
      if (!eventsMap.has(nodoCodigo)) {
        await loadAffectedEvents(nodoCodigo, risk);
      }
    }
  };

  const loadAffectedEvents = async (nodoCodigo: string, risk: NodeRisk) => {
    try {
      setLoadingEvents(prev => new Set(prev).add(nodoCodigo));
      
      const { data: events, error } = await supabase
        .from('generated_allocation_plan_details')
        .select(`
          id,
          fecha_programada,
          nodo_origen,
          nodo_destino,
          status,
          plan_id,
          producto:productos_cliente(nombre_producto),
          carrier:carriers(legal_name),
          plan:generated_allocation_plans!inner(plan_name, status)
        `)
        .or(`nodo_origen.eq.${nodoCodigo},nodo_destino.eq.${nodoCodigo}`)
        .in('plan.status', ['draft', 'merged'])
        .order('fecha_programada');

      if (error) throw error;

      const formattedEvents: AffectedEvent[] = (events || []).map(e => ({
        id: e.id,
        fecha_programada: e.fecha_programada,
        nodo_origen: e.nodo_origen,
        nodo_destino: e.nodo_destino,
        producto_nombre: e.producto?.nombre_producto || '',
        carrier_nombre: e.carrier?.legal_name || '',
        status: e.status,
        plan_id: e.plan_id,
        plan_name: e.plan?.plan_name || '',
      }));

      setEventsMap(prev => new Map(prev).set(nodoCodigo, formattedEvents));
      
      // Load available nodes for reassignment
      await loadAvailableNodesForReassignment(risk);
    } catch (error: any) {
      console.error('Error loading affected events:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los eventos afectados",
        variant: "destructive",
      });
    } finally {
      setLoadingEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodoCodigo);
        return newSet;
      });
    }
  };

  const loadAvailableNodesForReassignment = async (risk: NodeRisk) => {
    try {
      const clienteId = 13; // TODO: Get from context
      const isTypeC = risk.clasificacion === 'C';
      
      let query = supabase
        .from('nodos')
        .select(`
          codigo,
          panelista_id,
          ciudad_info:ciudades(clasificacion)
        `)
        .eq('cliente_id', clienteId)
        .eq('estado', 'activo')
        .neq('codigo', risk.nodo_codigo); // Exclude current node

      if (isTypeC) {
        query = query.eq('region_id', risk.region_id);
      } else {
        query = query.eq('ciudad_id', risk.ciudad_id);
      }

      const { data: nodes } = await query;
      let filteredNodes = nodes || [];

      // For type C, filter to only include other type C nodes
      if (isTypeC && filteredNodes.length > 0) {
        filteredNodes = filteredNodes.filter((n: any) => n.ciudad_info?.clasificacion === 'C');
      }

      // Get panelista names for nodes that have panelista_id
      const panelistaIds = filteredNodes.filter((n: any) => n.panelista_id).map((n: any) => n.panelista_id);
      const { data: panelistas } = await supabase
        .from('panelistas')
        .select('id, nombre_completo')
        .in('id', panelistaIds);

      const panelistasMap = new Map(panelistas?.map(p => [p.id, p.nombre_completo]) || []);

      // Also get panelistas by nodo_asignado
      const nodeCodes = filteredNodes.map((n: any) => n.codigo);
      const { data: panelistasByNodo } = await supabase
        .from('panelistas')
        .select('id, nombre_completo, nodo_asignado')
        .in('nodo_asignado', nodeCodes);

      const panelistasByNodoMap = new Map(
        panelistasByNodo?.map(p => [p.nodo_asignado, p.nombre_completo]) || []
      );

      setAvailableNodes(filteredNodes.map((n: any) => ({
        codigo: n.codigo,
        panelista_nombre: n.panelista_id 
          ? panelistasMap.get(n.panelista_id) || panelistasByNodoMap.get(n.codigo) || null
          : panelistasByNodoMap.get(n.codigo) || null,
      })));
    } catch (error: any) {
      console.error('Error loading available nodes:', error);
    }
  };

  const startEditingEvent = (event: AffectedEvent) => {
    setEditingEvent(event.id);
    setEditValues({
      fecha_programada: event.fecha_programada,
      nodo_origen: event.nodo_origen,
      nodo_destino: event.nodo_destino,
      status: event.status,
    });
  };

  const cancelEditingEvent = () => {
    setEditingEvent(null);
    setEditValues({});
  };

  const saveEventChanges = async (nodoCodigo: string, risk: NodeRisk) => {
    if (!editingEvent) return;

    try {
      const updates: any = {};
      
      if (editValues.fecha_programada) {
        updates.fecha_programada = editValues.fecha_programada;
      }
      
      if (editValues.nodo_origen && editValues.nodo_origen !== eventsMap.get(nodoCodigo)?.find(e => e.id === editingEvent)?.nodo_origen) {
        updates.nodo_origen = editValues.nodo_origen;
      }
      
      if (editValues.nodo_destino && editValues.nodo_destino !== eventsMap.get(nodoCodigo)?.find(e => e.id === editingEvent)?.nodo_destino) {
        updates.nodo_destino = editValues.nodo_destino;
      }
      
      if (editValues.status) {
        updates.status = editValues.status;
      }

      const { error } = await supabase
        .from('generated_allocation_plan_details')
        .update(updates)
        .eq('id', editingEvent);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Evento actualizado correctamente",
      });

      // Reload events for this node
      await loadAffectedEvents(nodoCodigo, risk);
      
      // Reload risks to update counts
      await loadNodeRisks();
      
      cancelEditingEvent();
    } catch (error: any) {
      console.error('Error saving event changes:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el evento",
        variant: "destructive",
      });
    }
  };

  const cancelEvent = async (eventId: number, nodoCodigo: string, risk: NodeRisk) => {
    try {
      const { error } = await supabase
        .from('generated_allocation_plan_details')
        .update({ status: 'CANCELLED' })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Evento cancelado correctamente",
      });

      // Reload events for this node
      await loadAffectedEvents(nodoCodigo, risk);
      
      // Reload risks to update counts
      await loadNodeRisks();
    } catch (error: any) {
      console.error('Error cancelling event:', error);
      toast({
        title: "Error",
        description: "No se pudo cancelar el evento",
        variant: "destructive",
      });
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
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Nodo</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Panelista</TableHead>
                      <TableHead>Tipo de Riesgo</TableHead>
                      <TableHead className="text-center">Eventos</TableHead>
                      <TableHead>Fechas</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead>Carriers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRisks.map((risk) => (
                      <React.Fragment key={risk.nodo_codigo}>
                        {/* Main Row */}
                        <TableRow 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRow(risk.nodo_codigo, risk)}
                        >
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {expandedRows.has(risk.nodo_codigo) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
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
                        </TableRow>

                        {/* Expanded Row - Events Table */}
                        {expandedRows.has(risk.nodo_codigo) && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-muted/30 p-0">
                              <div className="p-4">
                                {loadingEvents.has(risk.nodo_codigo) ? (
                                  <div className="flex justify-center items-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm mb-3">Eventos Afectados</h4>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Fecha</TableHead>
                                          <TableHead>Origen</TableHead>
                                          <TableHead>Destino</TableHead>
                                          <TableHead>Producto</TableHead>
                                          <TableHead>Carrier</TableHead>
                                          <TableHead>Plan</TableHead>
                                          <TableHead>Estado</TableHead>
                                          <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {eventsMap.get(risk.nodo_codigo)?.map((event) => (
                                          <TableRow key={event.id}>
                                            <TableCell>
                                              {editingEvent === event.id ? (
                                                <Input
                                                  type="date"
                                                  value={editValues.fecha_programada || event.fecha_programada}
                                                  onChange={(e) => setEditValues({ ...editValues, fecha_programada: e.target.value })}
                                                  className="w-36"
                                                />
                                              ) : (
                                                format(new Date(event.fecha_programada), 'dd/MM/yyyy')
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {editingEvent === event.id && event.nodo_origen === risk.nodo_codigo ? (
                                                <Select
                                                  value={editValues.nodo_origen || event.nodo_origen}
                                                  onValueChange={(value) => setEditValues({ ...editValues, nodo_origen: value })}
                                                >
                                                  <SelectTrigger className="w-40">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value={event.nodo_origen}>{event.nodo_origen} (actual)</SelectItem>
                                                    {availableNodes.map((node) => (
                                                      <SelectItem key={node.codigo} value={node.codigo}>
                                                        {node.codigo} {node.panelista_nombre && `(${node.panelista_nombre})`}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              ) : (
                                                <span className="text-sm">{event.nodo_origen}</span>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {editingEvent === event.id && event.nodo_destino === risk.nodo_codigo ? (
                                                <Select
                                                  value={editValues.nodo_destino || event.nodo_destino}
                                                  onValueChange={(value) => setEditValues({ ...editValues, nodo_destino: value })}
                                                >
                                                  <SelectTrigger className="w-40">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value={event.nodo_destino}>{event.nodo_destino} (actual)</SelectItem>
                                                    {availableNodes.map((node) => (
                                                      <SelectItem key={node.codigo} value={node.codigo}>
                                                        {node.codigo} {node.panelista_nombre && `(${node.panelista_nombre})`}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              ) : (
                                                <span className="text-sm">{event.nodo_destino}</span>
                                              )}
                                            </TableCell>
                                            <TableCell className="text-sm">{event.producto_nombre}</TableCell>
                                            <TableCell className="text-sm">{event.carrier_nombre}</TableCell>
                                            <TableCell className="text-sm">{event.plan_name}</TableCell>
                                            <TableCell>
                                              <Badge variant={event.status === 'CANCELLED' ? 'destructive' : 'outline'}>
                                                {event.status}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <div className="flex justify-end gap-2">
                                                {editingEvent === event.id ? (
                                                  <>
                                                    <Button
                                                      size="sm"
                                                      variant="default"
                                                      onClick={() => saveEventChanges(risk.nodo_codigo, risk)}
                                                    >
                                                      <Save className="h-3 w-3 mr-1" />
                                                      Guardar
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={cancelEditingEvent}
                                                    >
                                                      <X className="h-3 w-3 mr-1" />
                                                      Cancelar
                                                    </Button>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => startEditingEvent(event)}
                                                      disabled={event.status === 'CANCELLED'}
                                                    >
                                                      Editar
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="destructive"
                                                      onClick={() => cancelEvent(event.id, risk.nodo_codigo, risk)}
                                                      disabled={event.status === 'CANCELLED'}
                                                    >
                                                      Cancelar Evento
                                                    </Button>
                                                  </>
                                                )}
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
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
