import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCliente } from "@/contexts/ClienteContext";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertTriangle, 
  Package, 
  FileText,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  ArrowRight,
  Activity,
  Calendar,
  Truck
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from "recharts";

interface DashboardStats {
  // Allocation Plans
  activePlans: number;
  pendingPlans: number;
  completedPlansThisMonth: number;
  geographicCoverage: number;
  plansByProduct: { product: string; count: number }[];

  // Panelistas
  totalPanelists: number;
  activePanelists: number;
  inactivePanelists: number;
  panelistsWithIssues: number;
  topPanelists: { id: number; name: string; shipments: number; successRate: number }[];
  panelistsByRegion: { region: string; count: number }[];

  // Incidencias
  openIncidents: number;
  criticalIncidents: number;
  avgResolutionTime: number;
  incidentsByType: { type: string; count: number }[];
  incidentsBySeverity: { severity: string; count: number; color: string }[];
  incidentTrend: { date: string; count: number }[];

  // Envíos
  shipmentsThisMonth: number;
  completedShipments: number;
  inTransitShipments: number;
  delayedShipments: number;
  upcomingDeliveries24h: number;
  upcomingDeliveries48h: number;
  performanceByCarrier: { carrier: string; onTime: number; delayed: number; total: number }[];

  // Trends
  utilizationTrend: { date: string; percentage: number }[];
}

interface HelpContent {
  objective: string;
  interpretation: string;
  example: string;
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { clienteId, availableClientes, setSelectedClienteId } = useCliente();
  const { isSuperAdmin } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activePlans: 0,
    pendingPlans: 0,
    completedPlansThisMonth: 0,
    geographicCoverage: 0,
    plansByProduct: [],
    totalPanelists: 0,
    activePanelists: 0,
    inactivePanelists: 0,
    panelistsWithIssues: 0,
    topPanelists: [],
    panelistsByRegion: [],
    openIncidents: 0,
    criticalIncidents: 0,
    avgResolutionTime: 0,
    incidentsByType: [],
    incidentsBySeverity: [],
    incidentTrend: [],
    shipmentsThisMonth: 0,
    completedShipments: 0,
    inTransitShipments: 0,
    delayedShipments: 0,
    upcomingDeliveries24h: 0,
    upcomingDeliveries48h: 0,
    performanceByCarrier: [],
    utilizationTrend: [],
  });

  const [selectedPeriod, setSelectedPeriod] = useState<string>("today");

  const getDateRange = () => {
    const now = new Date();
    let from: Date;
    let to: Date = now;

    switch (selectedPeriod) {
      case "today":
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case "week":
        from = subDays(now, 7);
        break;
      case "month":
        from = startOfMonth(now);
        break;
      case "quarter":
        from = subDays(now, 90);
        break;
      case "year":
        from = startOfYear(now);
        break;
      default:
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    }

    return { from, to };
  };

  useEffect(() => {
    if (clienteId) {
      fetchDashboardData();
    }
  }, [clienteId, selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [
        plansData,
        panelistsData,
        incidentsData,
        shipmentsData,
      ] = await Promise.all([
        fetchAllocationPlansData(),
        fetchPanelistsData(),
        fetchIncidentsData(),
        fetchShipmentsData(),
      ]);

      setStats({
        ...plansData,
        ...panelistsData,
        ...incidentsData,
        ...shipmentsData,
      });
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Error loading dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocationPlansData = async () => {
    const { data: plans } = await supabase
      .from("generated_allocation_plans")
      .select("id, status, producto_id, created_at, productos_cliente(nombre_producto)")
      .eq("cliente_id", clienteId);

    const activePlans = plans?.filter(p => p.status === 'merged').length || 0;
    const pendingPlans = plans?.filter(p => p.status === 'draft').length || 0;

    const monthStart = startOfMonth(new Date());
    const completedPlansThisMonth = plans?.filter(p => 
      p.status === 'merged' && new Date(p.created_at) >= monthStart
    ).length || 0;

    // Geographic coverage
    const { data: totalNodes } = await supabase
      .from("nodos")
      .select("codigo")
      .eq("cliente_id", clienteId);

    const { data: coveredNodes } = await supabase
      .from("generated_allocation_plan_details")
      .select("nodo_origen, nodo_destino")
      .in("plan_id", plans?.map(p => p.id) || []);

    const uniqueCoveredNodes = new Set([
      ...(coveredNodes?.map(n => n.nodo_origen) || []),
      ...(coveredNodes?.map(n => n.nodo_destino) || []),
    ]);

    const geographicCoverage = totalNodes?.length 
      ? Math.round((uniqueCoveredNodes.size / totalNodes.length) * 100)
      : 0;

    // Plans by product
    const productMap = new Map<string, number>();
    plans?.forEach(plan => {
      const productName = (plan.productos_cliente as any)?.nombre_producto || 'Unknown';
      productMap.set(productName, (productMap.get(productName) || 0) + 1);
    });

    const plansByProduct = Array.from(productMap.entries()).map(([product, count]) => ({
      product,
      count,
    }));

    return {
      activePlans,
      pendingPlans,
      completedPlansThisMonth,
      geographicCoverage,
      plansByProduct,
    };
  };

  const fetchPanelistsData = async () => {
    const { data: panelists } = await supabase
      .from("panelistas")
      .select("id, nombre, apellido, estado, nodo, nodos(ciudades(regiones(nombre)))")
      .eq("cliente_id", clienteId);

    const totalPanelists = panelists?.length || 0;
    const activePanelists = panelists?.filter(p => p.estado === 'activo').length || 0;
    const inactivePanelists = panelists?.filter(p => p.estado === 'inactivo').length || 0;

    // Panelists with issues (with open incidents)
    const { data: incidentsWithPanelists } = await supabase
      .from("incidencias")
      .select("panelista_id")
      .eq("cliente_id", clienteId)
      .eq("estado", "abierta");

    const panelistsWithIssues = new Set(incidentsWithPanelists?.map(i => i.panelista_id).filter(Boolean)).size;

    // Top panelists (by shipments in last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);
    const { data: recentShipments } = await supabase
      .from("envios")
      .select("panelista_origen_id, panelista_destino_id, estado")
      .eq("cliente_id", clienteId)
      .gte("fecha_programada", thirtyDaysAgo.toISOString());

    const panelistShipmentCount = new Map<number, { total: number; completed: number }>();
    recentShipments?.forEach(s => {
      [s.panelista_origen_id, s.panelista_destino_id].forEach(pid => {
        if (pid) {
          const current = panelistShipmentCount.get(pid) || { total: 0, completed: 0 };
          current.total++;
          if (s.estado === 'RECEIVED') current.completed++;
          panelistShipmentCount.set(pid, current);
        }
      });
    });

    const topPanelists = Array.from(panelistShipmentCount.entries())
      .map(([id, stats]) => {
        const panelist = panelists?.find(p => p.id === id);
        return {
          id,
          name: panelist ? `${panelist.nombre} ${panelist.apellido}` : `Panelist ${id}`,
          shipments: stats.total,
          successRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.shipments - a.shipments)
      .slice(0, 5);

    // Panelists by region
    const regionMap = new Map<string, number>();
    panelists?.forEach(p => {
      const region = (p.nodos as any)?.ciudades?.regiones?.nombre || 'Unknown';
      regionMap.set(region, (regionMap.get(region) || 0) + 1);
    });

    const panelistsByRegion = Array.from(regionMap.entries()).map(([region, count]) => ({
      region,
      count,
    }));

    return {
      totalPanelists,
      activePanelists,
      inactivePanelists,
      panelistsWithIssues,
      topPanelists,
      panelistsByRegion,
    };
  };

  const fetchIncidentsData = async () => {
    const { data: incidents } = await supabase
      .from("incidencias")
      .select("id, tipo, prioridad, estado, fecha_creacion, fecha_resolucion")
      .eq("cliente_id", clienteId);

    const openIncidents = incidents?.filter(i => i.estado === 'abierta').length || 0;
    const criticalIncidents = incidents?.filter(i => i.prioridad === 'alta' && i.estado === 'abierta').length || 0;

    // Average resolution time
    const resolvedIncidents = incidents?.filter(i => i.estado === 'resuelta' && i.fecha_resolucion);
    const avgResolutionTime = resolvedIncidents?.length
      ? resolvedIncidents.reduce((sum, i) => {
          const created = new Date(i.fecha_creacion);
          const resolved = new Date(i.fecha_resolucion!);
          const hours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0) / resolvedIncidents.length
      : 0;

    // Incidents by type
    const typeMap = new Map<string, number>();
    incidents?.forEach(i => {
      typeMap.set(i.tipo, (typeMap.get(i.tipo) || 0) + 1);
    });

    const incidentsByType = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    // Incidents by severity
    const severityMap = new Map<string, { count: number; color: string }>();
    incidents?.forEach(i => {
      const current = severityMap.get(i.prioridad) || { count: 0, color: COLORS.info };
      current.count++;
      if (i.prioridad === 'alta') current.color = COLORS.danger;
      else if (i.prioridad === 'media') current.color = COLORS.warning;
      else current.color = COLORS.success;
      severityMap.set(i.prioridad, current);
    });

    const incidentsBySeverity = Array.from(severityMap.entries()).map(([severity, data]) => ({
      severity,
      count: data.count,
      color: data.color,
    }));

    // Incident trend (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'MMM dd'),
        count: incidents?.filter(inc => {
          const incDate = new Date(inc.fecha_creacion);
          return format(incDate, 'MMM dd') === format(date, 'MMM dd');
        }).length || 0,
      };
    });

    return {
      openIncidents,
      criticalIncidents,
      avgResolutionTime: Math.round(avgResolutionTime),
      incidentsByType,
      incidentsBySeverity,
      incidentTrend: last7Days,
    };
  };

  const fetchShipmentsData = async () => {
    const { from, to } = getDateRange();
    const { data: shipments } = await supabase
      .from("envios")
      .select("id, estado, fecha_programada, fecha_recepcion_real, carrier_id, carriers(legal_name)")
      .eq("cliente_id", clienteId)
      .gte("fecha_programada", from.toISOString())
      .lte("fecha_programada", to.toISOString());

    const shipmentsThisMonth = shipments?.length || 0;
    const completedShipments = shipments?.filter(s => s.estado === 'RECEIVED').length || 0;
    const inTransitShipments = shipments?.filter(s => s.estado === 'SENT').length || 0;

    // Delayed shipments (SENT and past scheduled date + 2 days)
    const now = new Date();
    const delayedShipments = shipments?.filter(s => {
      if (s.estado !== 'SENT') return false;
      const scheduled = new Date(s.fecha_programada);
      scheduled.setDate(scheduled.getDate() + 2);
      return now > scheduled;
    }).length || 0;

    // Upcoming deliveries
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const upcomingDeliveries24h = shipments?.filter(s => {
      const scheduled = new Date(s.fecha_programada);
      return s.estado === 'SENT' && scheduled <= next24h;
    }).length || 0;

    const upcomingDeliveries48h = shipments?.filter(s => {
      const scheduled = new Date(s.fecha_programada);
      return s.estado === 'SENT' && scheduled > next24h && scheduled <= next48h;
    }).length || 0;

    // Performance by carrier
    const carrierMap = new Map<string, { onTime: number; delayed: number; total: number }>();
    shipments?.forEach(s => {
      if (!s.carrier_id || s.estado !== 'RECEIVED') return;
      const carrierName = (s.carriers as any)?.legal_name || `Carrier ${s.carrier_id}`;
      const current = carrierMap.get(carrierName) || { onTime: 0, delayed: 0, total: 0 };
      current.total++;

      const scheduled = new Date(s.fecha_programada);
      scheduled.setDate(scheduled.getDate() + 2);
      const received = new Date(s.fecha_recepcion_real!);
      
      if (received <= scheduled) {
        current.onTime++;
      } else {
        current.delayed++;
      }

      carrierMap.set(carrierName, current);
    });

    const performanceByCarrier = Array.from(carrierMap.entries()).map(([carrier, stats]) => ({
      carrier,
      ...stats,
    }));

    // Utilization trend (last 7 days)
    const utilizationTrend = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayShipments = shipments?.filter(s => {
        const shipDate = new Date(s.fecha_programada);
        return format(shipDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      }).length || 0;

      return {
        date: format(date, 'MMM dd'),
        percentage: Math.min(100, dayShipments * 5), // Mock calculation
      };
    });

    return {
      shipmentsThisMonth,
      completedShipments,
      inTransitShipments,
      delayedShipments,
      upcomingDeliveries24h,
      upcomingDeliveries48h,
      performanceByCarrier,
      utilizationTrend,
    };
  };

  const HelpPopover = ({ content }: { content: HelpContent }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-accent">
          <Info className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-2 mb-1">
              🎯 Objetivo
            </h4>
            <p className="text-sm text-muted-foreground">{content.objective}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-2 mb-1">
              📖 Cómo interpretarlo
            </h4>
            <p className="text-sm text-muted-foreground">{content.interpretation}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-2 mb-1">
              💡 Ejemplo
            </h4>
            <p className="text-sm text-muted-foreground">{content.example}</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  const ClickableCard = ({ 
    children, 
    onClick, 
    className = "" 
  }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    className?: string;
  }) => (
    <Card 
      className={`transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </Card>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive overview of your postal quality operations</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Last updated: {format(new Date(), 'MMM dd, HH:mm')}
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label>Client Account</Label>
                  <Select value={clienteId?.toString()} onValueChange={(value) => setSelectedClienteId(parseInt(value))}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id.toString()}>
                          {cliente.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Allocation Plans */}
          <ClickableCard onClick={() => navigate('/allocation-plans?status=activo')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
              <div className="flex items-center gap-1">
                <HelpPopover content={{
                  objective: "Muestra el número de Allocation Plans actualmente en ejecución para gestionar la distribución de envíos.",
                  interpretation: "Un número alto indica buena planificación. Si es 0, necesitas generar planes urgentemente.",
                  example: "Si tienes 3 planes activos, significa que hay 3 configuraciones de distribución funcionando para diferentes productos o períodos."
                }} />
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.activePlans}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingPlans} pending approval
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <ArrowRight className="h-3 w-3" />
                <span>Click to view details</span>
              </div>
            </CardContent>
          </ClickableCard>

          {/* Active Panelists */}
          <ClickableCard onClick={() => navigate('/panelistas?status=activo')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Panelists</CardTitle>
              <div className="flex items-center gap-1">
                <HelpPopover content={{
                  objective: "Indica cuántos panelistas están activos y disponibles para realizar envíos del total registrado.",
                  interpretation: "El porcentaje de utilización muestra qué proporción de tu red está operativa. Menos del 70% puede indicar problemas.",
                  example: "Si tienes 45 de 50 panelistas activos (90%), tu red está bien utilizada. Si solo 20 están activos (40%), investiga por qué hay tantos inactivos."
                }} />
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {stats.activePanelists} <span className="text-sm text-muted-foreground">/ {stats.totalPanelists}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((stats.activePanelists / stats.totalPanelists) * 100)}% utilization
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <ArrowRight className="h-3 w-3" />
                <span>Click to manage</span>
              </div>
            </CardContent>
          </ClickableCard>

          {/* Open Incidents */}
          <ClickableCard onClick={() => navigate('/incidencias?status=abierta')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
              <div className="flex items-center gap-1">
                <HelpPopover content={{
                  objective: "Muestra incidencias sin resolver que requieren atención. Las críticas son prioritarias.",
                  interpretation: "Menos de 5 incidencias abiertas es saludable. Más de 10 indica problemas operacionales que necesitan atención inmediata.",
                  example: "Si tienes 8 incidencias abiertas y 3 son críticas, debes resolver las críticas primero (retrasos graves, panelistas sin contacto, etc.)."
                }} />
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.openIncidents}</div>
              <p className="text-xs text-danger mt-1">
                {stats.criticalIncidents} critical
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <ArrowRight className="h-3 w-3" />
                <span>Click to resolve</span>
              </div>
            </CardContent>
          </ClickableCard>

          {/* Shipments This Month */}
          <ClickableCard onClick={() => navigate('/envios')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shipments This Month</CardTitle>
              <div className="flex items-center gap-1">
                <HelpPopover content={{
                  objective: "Total de envíos programados este mes y cuántos se han completado exitosamente.",
                  interpretation: "El porcentaje de completados indica eficiencia operacional. Más del 80% es excelente.",
                  example: "Si tienes 156 envíos totales y 142 completados (91%), tu operación está funcionando muy bien. Si solo 80 están completados (51%), hay problemas de ejecución."
                }} />
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">{stats.shipmentsThisMonth}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completedShipments} completed ({Math.round((stats.completedShipments / stats.shipmentsThisMonth) * 100)}%)
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <ArrowRight className="h-3 w-3" />
                <span>Click to view all</span>
              </div>
            </CardContent>
          </ClickableCard>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Allocation Plan Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Allocation Plan Management
                    <HelpPopover content={{
                      objective: "Gestiona la distribución de envíos por producto y monitorea la cobertura geográfica de tus planes.",
                      interpretation: "La cobertura geográfica muestra qué porcentaje de tus nodos tienen asignación. Menos del 80% indica nodos sin cobertura.",
                      example: "Si tienes 85% de cobertura, significa que 85 de cada 100 nodos tienen panelistas asignados. Los 15 nodos restantes no pueden recibir/enviar."
                    }} />
                  </CardTitle>
                  <CardDescription>Distribution and coverage overview</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Geographic Coverage</p>
                    <p className="text-2xl font-bold text-primary">{stats.geographicCoverage}%</p>
                  </div>
                  <MapPin className="h-8 w-8 text-primary" />
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">Plans by Product</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.plansByProduct}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="product" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p className="text-lg font-bold text-green-600">{stats.activePlans}</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-lg font-bold text-yellow-600">{stats.pendingPlans}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-lg font-bold text-blue-600">{stats.completedPlansThisMonth}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Panelist Performance */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Panelist Performance
                    <HelpPopover content={{
                      objective: "Identifica a los panelistas más activos y aquellos que necesitan atención por bajo rendimiento o incidencias.",
                      interpretation: "Los top performers son tu red más confiable. Los panelistas con alertas requieren seguimiento o capacitación.",
                      example: "Si Juan Pérez tiene 45 envíos con 98% de éxito, es un panelista estrella. Si María López tiene 5 envíos con 40% de éxito, necesita soporte urgente."
                    }} />
                  </CardTitle>
                  <CardDescription>Top performers and alerts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Top 5 Active Panelists</h4>
                  <div className="space-y-2">
                    {stats.topPanelists.map((panelist, idx) => (
                      <div 
                        key={panelist.id} 
                        className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => navigate(`/panelistas?id=${panelist.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{panelist.name}</p>
                            <p className="text-xs text-muted-foreground">{panelist.shipments} shipments</p>
                          </div>
                        </div>
                        <div className={`text-sm font-semibold ${
                          panelist.successRate >= 95 ? 'text-green-600' :
                          panelist.successRate >= 85 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {panelist.successRate}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div 
                    className="p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => navigate('/panelistas?status=inactivo')}
                  >
                    <p className="text-xs text-muted-foreground">Inactive</p>
                    <p className="text-lg font-bold text-red-600">{stats.inactivePanelists}</p>
                  </div>
                  <div 
                    className="p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => navigate('/panelistas?has_issues=true')}
                  >
                    <p className="text-xs text-muted-foreground">With Issues</p>
                    <p className="text-lg font-bold text-orange-600">{stats.panelistsWithIssues}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Incidents & Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Incidents & Alerts
                    <HelpPopover content={{
                      objective: "Monitorea incidencias por tipo y severidad, y el tiempo promedio de resolución para mejorar la respuesta.",
                      interpretation: "Un tiempo de resolución bajo (< 24h) es excelente. Más de 48h indica procesos lentos. La tendencia muestra si los problemas aumentan o disminuyen.",
                      example: "Si el tiempo promedio es 18 horas y la tendencia es descendente, tu equipo está mejorando. Si es 72 horas y ascendente, hay problemas de gestión."
                    }} />
                  </CardTitle>
                  <CardDescription>Issue tracking and resolution</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Avg Resolution Time</p>
                    <p className="text-2xl font-bold text-primary">{stats.avgResolutionTime}h</p>
                  </div>
                  <Clock className="h-8 w-8 text-primary" />
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">By Severity</h4>
                  <div className="space-y-2">
                    {stats.incidentsBySeverity.map((item) => (
                      <div 
                        key={item.severity}
                        className="flex items-center justify-between p-2 rounded hover:bg-accent cursor-pointer"
                        onClick={() => navigate(`/incidencias?priority=${item.severity}`)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm capitalize">{item.severity}</span>
                        </div>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">Trend (Last 7 Days)</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={stats.incidentTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke={COLORS.danger} fill={COLORS.danger} fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operations Real-Time */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Operations Real-Time
                    <HelpPopover content={{
                      objective: "Visualiza el estado actual de los envíos: en tránsito, retrasados y próximas entregas programadas.",
                      interpretation: "Los envíos retrasados requieren acción inmediata. Las próximas entregas te ayudan a planificar recursos.",
                      example: "Si tienes 12 envíos retrasados de 45 en tránsito (27%), necesitas investigar causas. Si tienes 8 entregas en las próximas 24h, prepara al equipo de recepción."
                    }} />
                  </CardTitle>
                  <CardDescription>Current shipment status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className="p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => navigate('/envios?status=SENT')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <p className="text-xs font-medium text-muted-foreground">In Transit</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{stats.inTransitShipments}</p>
                  </div>

                  <div 
                    className="p-4 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => navigate('/envios?delayed=true')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <p className="text-xs font-medium text-muted-foreground">Delayed</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{stats.delayedShipments}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">Upcoming Deliveries</h4>
                  <div className="space-y-2">
                    <div 
                      className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-accent"
                      onClick={() => navigate('/envios?upcoming=24h')}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm">Next 24 hours</span>
                      </div>
                      <span className="font-semibold">{stats.upcomingDeliveries24h}</span>
                    </div>
                    <div 
                      className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-accent"
                      onClick={() => navigate('/envios?upcoming=48h')}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm">Next 48 hours</span>
                      </div>
                      <span className="font-semibold">{stats.upcomingDeliveries48h}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">Utilization Trend</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={stats.utilizationTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="percentage" stroke={COLORS.success} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance by Carrier */}
        {stats.performanceByCarrier.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Performance by Carrier
                    <HelpPopover content={{
                      objective: "Compara el rendimiento de diferentes carriers para identificar los más confiables y los que necesitan mejora.",
                      interpretation: "Carriers con más del 90% de entregas a tiempo son excelentes. Menos del 70% indica problemas serios que requieren renegociación o cambio.",
                      example: "Si Carrier A tiene 95% a tiempo de 100 envíos y Carrier B tiene 65% de 80 envíos, deberías priorizar Carrier A y revisar el contrato con Carrier B."
                    }} />
                  </CardTitle>
                  <CardDescription>On-time vs delayed shipments by carrier</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.performanceByCarrier}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="carrier" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="onTime" name="On Time" fill={COLORS.success} stackId="a" />
                  <Bar dataKey="delayed" name="Delayed" fill={COLORS.danger} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
