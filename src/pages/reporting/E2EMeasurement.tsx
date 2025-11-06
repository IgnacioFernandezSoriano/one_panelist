import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCliente } from "@/contexts/ClienteContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Download, TrendingUp, TrendingDown, Minus, Target, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfYear, endOfDay, startOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface EventoReal {
  id: number;
  carrier_id: number;
  producto_id: number;
  nodo_origen: string;
  nodo_destino: string;
  ciudad_origen: string;
  ciudad_destino: string;
  fecha_envio_real: string;
  fecha_recepcion_real: string;
  tiempo_transito_dias: number;
  standard_transit_days: number;
  target_performance_percentage: number;
  carriers?: {
    legal_name: string;
    carrier_code: string;
  };
  productos_cliente?: {
    nombre_producto: string;
  };
  nodo_origen_data?: {
    ciudades?: {
      nombre: string;
      regiones?: {
        nombre: string;
      };
    };
  };
  nodo_destino_data?: {
    ciudades?: {
      nombre: string;
      regiones?: {
        nombre: string;
      };
    };
  };
}

export default function E2EMeasurement() {
  const { clienteId } = useCliente();
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<EventoReal[]>([]);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // Filters
  const [selectedCarrier, setSelectedCarrier] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("last_week");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  useEffect(() => {
    if (clienteId) {
      fetchData();
    }
  }, [clienteId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch carriers and products for filters
      const [carriersRes, productsRes] = await Promise.all([
        supabase
          .from("carriers")
          .select("id, legal_name, carrier_code")
          .eq("cliente_id", clienteId)
          .eq("status", "active"),
        supabase
          .from("productos_cliente")
          .select("id, nombre_producto, codigo_producto")
          .eq("cliente_id", clienteId)
          .eq("estado", "activo"),
      ]);

      setCarriers(carriersRes.data || []);
      setProducts(productsRes.data || []);

      // Fetch eventos reales with standards
      const { data: eventosData, error: eventosError } = await supabase
        .rpc('get_eventos_reales_with_standards', { p_cliente_id: clienteId });

      if (eventosError) throw eventosError;

      if (!eventosData || eventosData.length === 0) {
        setEventos([]);
        setLoading(false);
        return;
      }

      // Get unique IDs for batch fetching
      const carrierIds = [...new Set(eventosData.map((e: any) => e.carrier_id).filter(Boolean))];
      const productoIds = [...new Set(eventosData.map((e: any) => e.producto_id).filter(Boolean))];
      const nodoCodigos = [...new Set([...eventosData.map((e: any) => e.nodo_origen), ...eventosData.map((e: any) => e.nodo_destino)].filter(Boolean))];

      // Batch fetch related data
      const [carriersData, productosData, nodosData] = await Promise.all([
        carrierIds.length > 0 ? supabase.from('carriers').select('id, legal_name, carrier_code').in('id', carrierIds) : Promise.resolve({ data: [] }),
        productoIds.length > 0 ? supabase.from('productos_cliente').select('id, nombre_producto').in('id', productoIds) : Promise.resolve({ data: [] }),
        nodoCodigos.length > 0 ? supabase.from('nodos').select('codigo, ciudades(nombre, regiones(nombre))').in('codigo', nodoCodigos) : Promise.resolve({ data: [] }),
      ]);

      // Create lookup maps
      const carriersMap = new Map((carriersData.data || []).map((c: any) => [c.id, c]));
      const productosMap = new Map((productosData.data || []).map((p: any) => [p.id, p]));
      const nodosMap = new Map((nodosData.data || []).map((n: any) => [n.codigo, n]));

      // Map eventos with related data
      const eventosWithRelations = eventosData.map((evento: any) => ({
        ...evento,
        carriers: carriersMap.get(evento.carrier_id) || null,
        productos_cliente: productosMap.get(evento.producto_id) || null,
        nodo_origen_data: nodosMap.get(evento.nodo_origen) || null,
        nodo_destino_data: nodosMap.get(evento.nodo_destino) || null,
      }));

      setEventos(eventosWithRelations);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Error loading dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Get date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    let from: Date;
    let to: Date = endOfDay(now);

    switch (selectedPeriod) {
      case "last_week":
        from = startOfDay(subDays(now, 7));
        break;
      case "last_month":
        from = startOfDay(subDays(now, 30));
        break;
      case "ytd":
        from = startOfYear(now);
        break;
      case "custom":
        if (customDateFrom && customDateTo) {
          from = startOfDay(new Date(customDateFrom));
          to = endOfDay(new Date(customDateTo));
        } else {
          from = startOfDay(subDays(now, 30)); // Default to last month
        }
        break;
      default:
        from = startOfDay(subDays(now, 7));
    }

    return { from, to };
  };

  // Filter eventos based on selected filters
  const filteredEventos = useMemo(() => {
    let filtered = [...eventos];

    // Carrier filter
    if (selectedCarrier !== "all") {
      filtered = filtered.filter(e => e.carrier_id?.toString() === selectedCarrier);
    }

    // Product filter
    if (selectedProduct !== "all") {
      filtered = filtered.filter(e => e.producto_id?.toString() === selectedProduct);
    }

    // Date range filter
    const { from, to } = getDateRange();
    filtered = filtered.filter(e => {
      if (!e.fecha_recepcion_real) return false;
      const fechaRecepcion = new Date(e.fecha_recepcion_real);
      return fechaRecepcion >= from && fechaRecepcion <= to;
    });

    return filtered;
  }, [eventos, selectedCarrier, selectedProduct, selectedPeriod, customDateFrom, customDateTo]);

  // Calculate KPIs from filtered eventos
  const kpis = useMemo(() => {
    if (filteredEventos.length === 0) {
      return {
        totalEvents: 0,
        avgTransitTime: 0,
        onTimePercentage: 0,
        delayedEvents: 0,
        avgStandard: 0,
        performanceVsTarget: 0,
      };
    }

    const totalEvents = filteredEventos.length;
    const totalTransitTime = filteredEventos.reduce((sum, e) => sum + (e.tiempo_transito_dias || 0), 0);
    const avgTransitTime = totalTransitTime / totalEvents;

    const totalStandard = filteredEventos.reduce((sum, e) => sum + (e.standard_transit_days || 0), 0);
    const avgStandard = totalStandard / totalEvents;

    const onTimeEvents = filteredEventos.filter(e => 
      (e.tiempo_transito_dias || 0) <= (e.standard_transit_days || 0)
    ).length;
    const onTimePercentage = (onTimeEvents / totalEvents) * 100;

    const delayedEvents = totalEvents - onTimeEvents;

    // Calculate performance vs target
    const eventsWithTarget = filteredEventos.filter(e => e.target_performance_percentage);
    const avgTarget = eventsWithTarget.length > 0
      ? eventsWithTarget.reduce((sum, e) => sum + (e.target_performance_percentage || 0), 0) / eventsWithTarget.length
      : 0;
    const performanceVsTarget = avgTarget > 0 ? onTimePercentage - avgTarget : 0;

    return {
      totalEvents,
      avgTransitTime: Math.round(avgTransitTime * 10) / 10,
      onTimePercentage: Math.round(onTimePercentage * 10) / 10,
      delayedEvents,
      avgStandard: Math.round(avgStandard * 10) / 10,
      performanceVsTarget: Math.round(performanceVsTarget * 10) / 10,
    };
  }, [filteredEventos]);

  // Calculate carrier performance data for charts
  const carrierPerformanceData = useMemo(() => {
    const carrierStats = new Map<number, {
      carrier_name: string;
      total: number;
      onTime: number;
      delayed: number;
      avgTransit: number;
    }>();

    filteredEventos.forEach(evento => {
      if (!evento.carrier_id || !evento.carriers) return;

      const existing = carrierStats.get(evento.carrier_id) || {
        carrier_name: evento.carriers.legal_name || `Carrier ${evento.carrier_id}`,
        total: 0,
        onTime: 0,
        delayed: 0,
        avgTransit: 0,
      };

      existing.total++;
      if ((evento.tiempo_transito_dias || 0) <= (evento.standard_transit_days || 0)) {
        existing.onTime++;
      } else {
        existing.delayed++;
      }
      existing.avgTransit += evento.tiempo_transito_dias || 0;

      carrierStats.set(evento.carrier_id, existing);
    });

    return Array.from(carrierStats.values()).map(stat => ({
      ...stat,
      avgTransit: Math.round((stat.avgTransit / stat.total) * 10) / 10,
      onTimePercentage: Math.round((stat.onTime / stat.total) * 100 * 10) / 10,
    })).sort((a, b) => b.onTimePercentage - a.onTimePercentage);
  }, [filteredEventos]);

  // Calculate product performance data for charts
  const productPerformanceData = useMemo(() => {
    const productStats = new Map<number, {
      product_name: string;
      total: number;
      onTime: number;
      delayed: number;
      avgTransit: number;
    }>();

    filteredEventos.forEach(evento => {
      if (!evento.producto_id || !evento.productos_cliente) return;

      const existing = productStats.get(evento.producto_id) || {
        product_name: evento.productos_cliente.nombre_producto || `Product ${evento.producto_id}`,
        total: 0,
        onTime: 0,
        delayed: 0,
        avgTransit: 0,
      };

      existing.total++;
      if ((evento.tiempo_transito_dias || 0) <= (evento.standard_transit_days || 0)) {
        existing.onTime++;
      } else {
        existing.delayed++;
      }
      existing.avgTransit += evento.tiempo_transito_dias || 0;

      productStats.set(evento.producto_id, existing);
    });

    return Array.from(productStats.values()).map(stat => ({
      ...stat,
      avgTransit: Math.round((stat.avgTransit / stat.total) * 10) / 10,
      onTimePercentage: Math.round((stat.onTime / stat.total) * 100 * 10) / 10,
    })).sort((a, b) => b.onTimePercentage - a.onTimePercentage);
  }, [filteredEventos]);

  // Calculate transit time distribution
  const transitDistributionData = useMemo(() => {
    const distribution = new Map<number, number>();
    
    filteredEventos.forEach(evento => {
      const days = evento.tiempo_transito_dias || 0;
      distribution.set(days, (distribution.get(days) || 0) + 1);
    });

    return Array.from(distribution.entries())
      .map(([days, count]) => ({ days, count }))
      .sort((a, b) => a.days - b.days);
  }, [filteredEventos]);

  // Calculate route performance data
  const routePerformanceData = useMemo(() => {
    const routeStats = new Map<string, {
      route: string;
      total: number;
      onTime: number;
      avgTransit: number;
    }>();

    filteredEventos.forEach(evento => {
      const route = `${evento.ciudad_origen} → ${evento.ciudad_destino}`;
      
      const existing = routeStats.get(route) || {
        route,
        total: 0,
        onTime: 0,
        avgTransit: 0,
      };

      existing.total++;
      if ((evento.tiempo_transito_dias || 0) <= (evento.standard_transit_days || 0)) {
        existing.onTime++;
      }
      existing.avgTransit += evento.tiempo_transito_dias || 0;

      routeStats.set(route, existing);
    });

    return Array.from(routeStats.values())
      .map(stat => ({
        ...stat,
        avgTransit: Math.round((stat.avgTransit / stat.total) * 10) / 10,
        onTimePercentage: Math.round((stat.onTime / stat.total) * 100 * 10) / 10,
      }))
      .filter(stat => stat.total >= 5) // Only show routes with at least 5 events
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 routes
  }, [filteredEventos]);

  // Calculate temporal trend data (weekly)
  const temporalTrendData = useMemo(() => {
    const weeklyStats = new Map<string, {
      week: string;
      total: number;
      onTime: number;
    }>();

    filteredEventos.forEach(evento => {
      if (!evento.fecha_recepcion_real) return;
      
      const date = new Date(evento.fecha_recepcion_real);
      const weekStart = startOfDay(new Date(date.setDate(date.getDate() - date.getDay())));
      const weekKey = format(weekStart, 'MMM dd');

      const existing = weeklyStats.get(weekKey) || {
        week: weekKey,
        total: 0,
        onTime: 0,
      };

      existing.total++;
      if ((evento.tiempo_transito_dias || 0) <= (evento.standard_transit_days || 0)) {
        existing.onTime++;
      }

      weeklyStats.set(weekKey, existing);
    });

    return Array.from(weeklyStats.values())
      .map(stat => ({
        ...stat,
        onTimePercentage: Math.round((stat.onTime / stat.total) * 100 * 10) / 10,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [filteredEventos]);

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

  // Export to CSV function
  const exportToCSV = () => {
    try {
      // Prepare CSV headers
      const headers = [
        'Tracking Number',
        'Carrier',
        'Product',
        'Origin City',
        'Destination City',
        'Scheduled Date',
        'Sent Date',
        'Received Date',
        'Transit Days',
        'Standard Days',
        'On-Time',
        'Performance Status'
      ];

      // Prepare CSV rows
      const rows = filteredEventos.map(evento => [
        evento.numero_etiqueta || '',
        evento.carriers?.legal_name || '',
        evento.productos_cliente?.nombre_producto || '',
        evento.ciudad_origen || '',
        evento.ciudad_destino || '',
        evento.fecha_programada ? format(new Date(evento.fecha_programada), 'yyyy-MM-dd') : '',
        evento.fecha_envio_real ? format(new Date(evento.fecha_envio_real), 'yyyy-MM-dd HH:mm') : '',
        evento.fecha_recepcion_real ? format(new Date(evento.fecha_recepcion_real), 'yyyy-MM-dd HH:mm') : '',
        evento.tiempo_transito_dias || '',
        evento.standard_transit_days || '',
        (evento.tiempo_transito_dias || 0) <= (evento.standard_transit_days || 0) ? 'Yes' : 'No',
        (evento.tiempo_transito_dias || 0) <= (evento.standard_transit_days || 0) ? 'On-Time' : 'Delayed'
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `e2e_measurement_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export report');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">E2E Measurement</h1>
            <p className="text-muted-foreground">
              End-to-end quality performance analysis and compliance tracking
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={exportToCSV}>
            <Download className="w-4 h-4" />
            Export to CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Customize your analysis view</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Carrier Filter */}
              <div className="space-y-2">
                <Label>Carrier</Label>
                <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Carriers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Carriers</SelectItem>
                    {carriers.map((carrier) => (
                      <SelectItem key={carrier.id} value={carrier.id.toString()}>
                        {carrier.legal_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Filter */}
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.nombre_producto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Period Filter */}
              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="ytd">Year to Date</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range (shown when custom is selected) */}
              {selectedPeriod === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <input
                      type="date"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <input
                      type="date"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPIs Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.totalEvents.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Validated quality events
              </p>
            </CardContent>
          </Card>

          {/* On-Time Delivery % */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className={`text-2xl font-bold ${
                  kpis.onTimePercentage >= 95 ? 'text-green-600' :
                  kpis.onTimePercentage >= 85 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {kpis.onTimePercentage}%
                </div>
                {kpis.performanceVsTarget !== 0 && (
                  <div className={`flex items-center text-xs ${
                    kpis.performanceVsTarget > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {kpis.performanceVsTarget > 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(kpis.performanceVsTarget)}%
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {kpis.totalEvents - kpis.delayedEvents} of {kpis.totalEvents} events
              </p>
            </CardContent>
          </Card>

          {/* Avg Transit Time */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Transit Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">{kpis.avgTransitTime}</div>
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Standard: {kpis.avgStandard} days
              </p>
            </CardContent>
          </Card>

          {/* Delayed Events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delayed Events</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{kpis.delayedEvents.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {kpis.totalEvents > 0 ? Math.round((kpis.delayedEvents / kpis.totalEvents) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Carrier Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Carrier</CardTitle>
              <CardDescription>On-time delivery percentage comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={carrierPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="carrier_name" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="onTimePercentage" name="On-Time %" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Product Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Product</CardTitle>
              <CardDescription>On-time delivery percentage by product type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="onTimePercentage" name="On-Time %" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Transit Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Transit Time Distribution</CardTitle>
            <CardDescription>Frequency of delivery times in days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transitDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="days" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Events', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="count" name="Events" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Carrier Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Carrier Performance Details</CardTitle>
            <CardDescription>Detailed breakdown by carrier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Carrier</th>
                    <th className="text-right py-2 px-4">Total Events</th>
                    <th className="text-right py-2 px-4">On-Time</th>
                    <th className="text-right py-2 px-4">Delayed</th>
                    <th className="text-right py-2 px-4">On-Time %</th>
                    <th className="text-right py-2 px-4">Avg Transit</th>
                  </tr>
                </thead>
                <tbody>
                  {carrierPerformanceData.map((carrier, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-4 font-medium">{carrier.carrier_name}</td>
                      <td className="text-right py-2 px-4">{carrier.total.toLocaleString()}</td>
                      <td className="text-right py-2 px-4 text-green-600">{carrier.onTime.toLocaleString()}</td>
                      <td className="text-right py-2 px-4 text-red-600">{carrier.delayed.toLocaleString()}</td>
                      <td className="text-right py-2 px-4">
                        <span className={`font-semibold ${
                          carrier.onTimePercentage >= 95 ? 'text-green-600' :
                          carrier.onTimePercentage >= 85 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {carrier.onTimePercentage}%
                        </span>
                      </td>
                      <td className="text-right py-2 px-4">{carrier.avgTransit} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Temporal Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend Over Time</CardTitle>
            <CardDescription>Weekly on-time delivery percentage evolution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temporalTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="onTimePercentage" 
                  name="On-Time %" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Routes Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Top Routes Performance</CardTitle>
            <CardDescription>Most frequent routes and their performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Route</th>
                    <th className="text-right py-2 px-4">Total Events</th>
                    <th className="text-right py-2 px-4">On-Time</th>
                    <th className="text-right py-2 px-4">On-Time %</th>
                    <th className="text-right py-2 px-4">Avg Transit</th>
                  </tr>
                </thead>
                <tbody>
                  {routePerformanceData.map((route, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-4 font-medium">{route.route}</td>
                      <td className="text-right py-2 px-4">{route.total.toLocaleString()}</td>
                      <td className="text-right py-2 px-4 text-green-600">{route.onTime.toLocaleString()}</td>
                      <td className="text-right py-2 px-4">
                        <span className={`font-semibold ${
                          route.onTimePercentage >= 95 ? 'text-green-600' :
                          route.onTimePercentage >= 85 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {route.onTimePercentage}%
                        </span>
                      </td>
                      <td className="text-right py-2 px-4">{route.avgTransit} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
