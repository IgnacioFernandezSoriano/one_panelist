import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RefreshCw, MapPin, User, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { calculateWeekRange, type WeekInfo } from "@/lib/weekCalculations";
import { WeeklyLoadTable, type NodeWeeklyLoad } from "@/components/node-detail/WeeklyLoadTable";
import { AffectedEventsTable, type AffectedEvent } from "@/components/node-detail/AffectedEventsTable";

interface NodeRisk {
  nodo_codigo: string;
  ciudad: string;
  region: string;
  pais: string;
  panelista_nombre: string | null;
  panelista_id: number | null;
  risk_type: 'sin_panelista' | 'panelista_baja';
  affected_events_count: number;
  first_event_date: string;
  last_event_date: string;
  leave_start?: string;
  leave_end?: string;
  leave_reason?: string;
  ciudad_id: number;
  region_id: number;
  clasificacion: string;
}

const NodeDetail = () => {
  const { nodoCodigo } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nodeRisk, setNodeRisk] = useState<NodeRisk | null>(null);
  const [weekRange, setWeekRange] = useState<WeekInfo[]>([]);
  const [affectedEvents, setAffectedEvents] = useState<AffectedEvent[]>([]);
  const [weeklyLoads, setWeeklyLoads] = useState<NodeWeeklyLoad[]>([]);
  const [availableNodes, setAvailableNodes] = useState<{ codigo: string; panelista_nombre: string | null }[]>([]);
  const [maxEventsPerWeek, setMaxEventsPerWeek] = useState(5);

  useEffect(() => {
    if (nodoCodigo) {
      loadNodeDetail();
    }
  }, [nodoCodigo]);

  const loadNodeDetail = async () => {
    try {
      setLoading(true);

      // Get current user's cliente_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error("No user found");

      // @ts-ignore - Supabase type inference issue
      const userQuery = await supabase
        .from('usuarios')
        .select('id, cliente_id')
        .eq('email', user.email)
        .maybeSingle();

      if (!userQuery.data) throw new Error("User data not found");
      
      const clienteId = userQuery.data.cliente_id;

      const nodoQuery = await supabase
        .from('nodos')
        .select(`
          codigo,
          ciudad,
          pais,
          panelista_id,
          panelista:panelistas!fk_nodos_panelista(id, nombre_completo),
          region:regiones(id, nombre),
          ciudad_info:ciudades(id, nombre, clasificacion)
        `)
        .eq('codigo', nodoCodigo)
        .eq('cliente_id', clienteId)
        .maybeSingle();

      if (!nodoQuery.data) throw new Error("Node not found");

      const nodoData = nodoQuery.data as {
        codigo: string;
        ciudad: string;
        pais: string;
        panelista_id: number | null;
        panelista: { id: number; nombre_completo: string } | null;
        region: { id: number; nombre: string } | null;
        ciudad_info: { id: number; nombre: string; clasificacion: string } | null;
      };

      // Load client configuration
      const { data: cliente } = await supabase
        .from('clientes')
        .select('max_events_per_panelist_week')
        .eq('id', clienteId)
        .single();

      setMaxEventsPerWeek(cliente?.max_events_per_panelist_week || 5);

      // Load affected events
      const eventsQuery = await supabase
        .from('generated_allocation_plan_details')
        .select(`
          id,
          fecha_programada,
          nodo_origen,
          nodo_destino,
          plan_id,
          plan:generated_allocation_plans!inner(status)
        `)
        .eq('cliente_id', clienteId)
        .or(`nodo_origen.eq.${nodoCodigo},nodo_destino.eq.${nodoCodigo}`)
        .in('plan.status', ['draft', 'merged'])
        .order('fecha_programada');

      const formattedEvents: AffectedEvent[] = (eventsQuery.data || []).map((e: any) => ({
        id: e.id,
        fecha_programada: e.fecha_programada,
        nodo_origen: e.nodo_origen,
        nodo_destino: e.nodo_destino,
        status: e.plan?.status || 'draft',
        plan_id: e.plan_id,
      }));

      setAffectedEvents(formattedEvents);

      // Check for scheduled leaves
      let leaveInfo = {};
      if (nodoData.panelista_id) {
        const { data: leaves } = await supabase
          .from('scheduled_leaves')
          .select('leave_start_date, leave_end_date, reason')
          .eq('panelista_id', nodoData.panelista_id)
          .eq('status', 'scheduled')
          .gte('leave_end_date', format(new Date(), 'yyyy-MM-dd'))
          .order('leave_start_date')
          .limit(1);

        if (leaves && leaves.length > 0) {
          leaveInfo = {
            leave_start: leaves[0].leave_start_date,
            leave_end: leaves[0].leave_end_date,
            leave_reason: leaves[0].reason,
          };
        }
      }

      const risk: NodeRisk = {
        nodo_codigo: nodoData.codigo,
        ciudad: nodoData.ciudad_info?.nombre || nodoData.ciudad,
        region: nodoData.region?.nombre || '',
        pais: nodoData.pais,
        panelista_nombre: nodoData.panelista?.nombre_completo || null,
        panelista_id: nodoData.panelista_id,
        risk_type: nodoData.panelista_id ? 'panelista_baja' : 'sin_panelista',
        affected_events_count: formattedEvents.length,
        first_event_date: formattedEvents[0]?.fecha_programada || format(new Date(), 'yyyy-MM-dd'),
        last_event_date: formattedEvents[formattedEvents.length - 1]?.fecha_programada || format(new Date(), 'yyyy-MM-dd'),
        ciudad_id: nodoData.ciudad_info?.id || 0,
        region_id: nodoData.region?.id || 0,
        clasificacion: nodoData.ciudad_info?.clasificacion || 'C',
        ...leaveInfo,
      };

      setNodeRisk(risk);

      // Calculate week range centered on first event, filter to only future weeks
      const allWeeks = calculateWeekRange(risk.first_event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureWeeks = allWeeks.filter(week => week.endDate >= today);
      setWeekRange(futureWeeks);

      // Load available nodes (same city for A/B, same region for C)
      await loadAvailableNodes(risk, clienteId);

      // Load weekly loads
      await loadWeeklyLoads(futureWeeks, risk, clienteId);

    } catch (error) {
      console.error('Error loading node detail:', error);
      toast.error('Error al cargar los detalles del nodo');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableNodes = async (risk: NodeRisk, clienteId: number) => {
    const isTypeC = risk.clasificacion === 'C';
    
    let query = supabase
      .from('nodos')
      .select(`
        codigo,
        panelista:panelistas!fk_nodos_panelista(nombre_completo),
        ciudad_info:ciudades(clasificacion)
      `)
      .eq('cliente_id', clienteId)
      .eq('estado', 'activo');

    if (isTypeC) {
      query = query.eq('region_id', risk.region_id);
    } else {
      query = query.eq('ciudad_id', risk.ciudad_id);
    }

    const nodesQuery = await query;
    let nodes = nodesQuery.data;

    // For type C, filter to only include other type C nodes
    if (isTypeC && nodes) {
      nodes = nodes.filter((n: any) => n.ciudad_info?.clasificacion === 'C');
    }

    setAvailableNodes((nodes || []).map((n: {
      codigo: string;
      panelista: { nombre_completo: string } | null;
    }) => ({
      codigo: n.codigo,
      panelista_nombre: n.panelista?.nombre_completo || null,
    })));
  };

  const loadWeeklyLoads = async (weeks: WeekInfo[], risk: NodeRisk, clienteId: number) => {
    const startDate = format(weeks[0].startDate, 'yyyy-MM-dd');
    const endDate = format(weeks[6].endDate, 'yyyy-MM-dd');

    // Get all events in the date range
    const eventsQuery = await supabase
      .from('generated_allocation_plan_details')
      .select(`
        fecha_programada,
        nodo_origen,
        nodo_destino,
        plan:generated_allocation_plans!inner(status)
      `)
      .eq('cliente_id', clienteId)
      .in('plan.status', ['draft', 'merged'])
      .gte('fecha_programada', startDate)
      .lte('fecha_programada', endDate);

    const events = eventsQuery.data;

    // Get nodes for the same city/region
    const isTypeC = risk.clasificacion === 'C';
    let nodeQuery = supabase
      .from('nodos')
      .select(`
        codigo,
        panelista_id,
        panelista:panelistas!fk_nodos_panelista(nombre_completo),
        ciudad_info:ciudades(clasificacion)
      `)
      .eq('cliente_id', clienteId)
      .eq('estado', 'activo');

    if (isTypeC) {
      nodeQuery = nodeQuery.eq('region_id', risk.region_id);
    } else {
      nodeQuery = nodeQuery.eq('ciudad_id', risk.ciudad_id);
    }

    const nodeQueryResult = await nodeQuery;
    let nodes = nodeQueryResult.data;

    // For type C, filter to only include other type C nodes
    if (isTypeC && nodes) {
      nodes = nodes.filter((n: any) => n.ciudad_info?.clasificacion === 'C');
    }

    // Calculate weekly loads
    const loads: NodeWeeklyLoad[] = (nodes || []).map((node: {
      codigo: string;
      panelista_id: number | null;
      panelista: { nombre_completo: string } | null;
    }) => {
      const weekCounts = weeks.map((week) => {
        return (events || []).filter((e: {
          fecha_programada: string;
          nodo_origen: string;
          nodo_destino: string;
        }) => {
          const eventDate = new Date(e.fecha_programada);
          return (
            (e.nodo_origen === node.codigo || e.nodo_destino === node.codigo) &&
            eventDate >= week.startDate &&
            eventDate <= week.endDate
          );
        }).length;
      });

      return {
        nodo_codigo: node.codigo,
        panelista_nombre: node.panelista?.nombre_completo || null,
        panelista_id: node.panelista_id,
        week_minus_2: weekCounts[0],
        week_minus_1: weekCounts[1],
        week_0: weekCounts[2],
        week_plus_1: weekCounts[3],
        week_plus_2: weekCounts[4],
        week_plus_3: weekCounts[5],
        week_plus_4: weekCounts[6],
        total: weekCounts.reduce((a, b) => a + b, 0),
        maxPerWeek: maxEventsPerWeek,
      };
    });

    setWeeklyLoads(loads);
  };

  const handleSaveEvent = async (eventId: number, updates: Partial<AffectedEvent>) => {
    try {
      const { error } = await supabase
        .from('generated_allocation_plan_details')
        .update(updates)
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Evento actualizado correctamente');
      
      // Reload data
      setRefreshing(true);
      await loadNodeDetail();
      setRefreshing(false);
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Error al actualizar el evento');
    }
  };

  const getRiskBadge = (type: string) => {
    if (type === 'sin_panelista') {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Sin Panelista</Badge>;
    }
    return <Badge className="gap-1 bg-warning text-warning-foreground"><AlertCircle className="h-3 w-3" />Panelista de Baja</Badge>;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!nodeRisk) {
    return (
      <AppLayout>
        <div className="p-6">
          <Button variant="outline" onClick={() => navigate('/issues/nodos-descubiertos')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div className="text-center mt-8">
            <p className="text-muted-foreground">No se encontró información del nodo</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/issues/nodos-descubiertos')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Button variant="outline" onClick={loadNodeDetail} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Node Info Card */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold font-mono">{nodeRisk.nodo_codigo}</h1>
                <div className="mt-2">{getRiskBadge(nodeRisk.risk_type)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{nodeRisk.ciudad}</p>
                  <p className="text-xs text-muted-foreground">{nodeRisk.region} • {nodeRisk.pais}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {nodeRisk.panelista_nombre || <span className="text-muted-foreground italic">Sin panelista</span>}
                  </p>
                  {nodeRisk.leave_start && nodeRisk.leave_end && (
                    <p className="text-xs text-warning-foreground">
                      Baja: {format(new Date(nodeRisk.leave_start), 'dd/MM')} - {format(new Date(nodeRisk.leave_end), 'dd/MM')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{nodeRisk.affected_events_count} eventos afectados</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(nodeRisk.first_event_date), 'dd/MM', { locale: es })} - {format(new Date(nodeRisk.last_event_date), 'dd/MM', { locale: es })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Affected Events Table */}
        <Card className="p-6">
          <AffectedEventsTable
            events={affectedEvents}
            availableNodes={availableNodes}
            onSaveEvent={handleSaveEvent}
          />
        </Card>

        {/* Weekly Load Table */}
        <Card className="p-6">
          <WeeklyLoadTable
            loads={weeklyLoads}
            weekRange={weekRange}
            maxEventsPerWeek={maxEventsPerWeek}
          />
        </Card>
      </div>
    </AppLayout>
  );
};

export default NodeDetail;
