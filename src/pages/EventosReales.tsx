import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCliente } from "@/contexts/ClienteContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Search, CheckCircle, TrendingUp, Clock, Package, Calendar, X } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { format, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { EventoRealDetailsDialog } from "@/components/eventos-reales/EventoRealDetailsDialog";

interface EventoReal {
  id: number;
  allocation_plan_detail_id: number | null;
  cliente_id: number;
  carrier_id: number | null;
  producto_id: number | null;
  nodo_origen_id: number;
  nodo_destino_id: number;
  ciudad_origen: string;
  ciudad_destino: string;
  panelista_origen_id: number | null;
  panelista_destino_id: number | null;
  fecha_programada: string;
  fecha_envio_real: string | null;
  fecha_recepcion_real: string | null;
  tiempo_transito_dias: number | null;
  tiempo_transito_horas: number | null;
  numero_etiqueta: string | null;
  fecha_validacion: string;
  validado_por: number | null;
  carriers?: {
    legal_name: string;
    carrier_code: string;
    commercial_name: string;
    status: string;
  };
  productos_cliente?: {
    nombre_producto: string;
    codigo_producto: string;
    standard_delivery_hours: number | null;
  };
  panelista_origen?: {
    nombre_completo: string;
  };
  panelista_destino?: {
    nombre_completo: string;
  };
  validado_por_usuario?: {
    nombre_completo: string;
  };
  nodo_origen_data?: {
    codigo: string;
    ciudad_id: number;
    region_id: number;
    ciudad: string;
    ciudades?: {
      nombre: string;
      region_id: number;
      regiones?: {
        nombre: string;
      };
    };
  };
  nodo_destino_data?: {
    codigo: string;
    ciudad_id: number;
    region_id: number;
    ciudad: string;
    ciudades?: {
      nombre: string;
      region_id: number;
      regiones?: {
        nombre: string;
      };
    };
  };
}

export default function EventosReales() {
  const { clienteId } = useCliente();
  const [roleLoading, setRoleLoading] = useState(false);
  const [eventos, setEventos] = useState<EventoReal[]>([]);
  const [filteredEventos, setFilteredEventos] = useState<EventoReal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedCiudadOrigen, setSelectedCiudadOrigen] = useState<string>("all");
  const [selectedCiudadDestino, setSelectedCiudadDestino] = useState<string>("all");
  const [selectedRegionOrigen, setSelectedRegionOrigen] = useState<string>("all");
  const [selectedRegionDestino, setSelectedRegionDestino] = useState<string>("all");
  const [dateFilterType, setDateFilterType] = useState<string>("validation_date");
  const [quickDateFilter, setQuickDateFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [carriers, setCarriers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [ciudades, setCiudades] = useState<any[]>([]);
  const [regiones, setRegiones] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventoReal | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    if (!roleLoading && clienteId) {
      fetchData();
    }
  }, [roleLoading, clienteId]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedCarrier, selectedProduct, selectedCiudadOrigen, selectedCiudadDestino, selectedRegionOrigen, selectedRegionDestino, dateFilterType, quickDateFilter, dateFrom, dateTo, eventos]);

  // Sync quick filter with date inputs
  useEffect(() => {
    if (quickDateFilter !== "all") {
      const range = getQuickDateRange(quickDateFilter);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, [quickDateFilter]);

  const getQuickDateRange = (filterType: string): { from: string; to: string } => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    switch (filterType) {
      case "this_week":
        return {
          from: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          to: todayStr,
        };
      case "this_month":
        return {
          from: format(startOfMonth(today), "yyyy-MM-dd"),
          to: todayStr,
        };
      case "this_year":
        return {
          from: format(startOfYear(today), "yyyy-MM-dd"),
          to: todayStr,
        };
      default:
        return { from: "", to: "" };
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCarrier("all");
    setSelectedProduct("all");
    setSelectedCiudadOrigen("all");
    setSelectedCiudadDestino("all");
    setSelectedRegionOrigen("all");
    setSelectedRegionDestino("all");
    setDateFilterType("validation_date");
    setQuickDateFilter("all");
    setDateFrom("");
    setDateTo("");
    toast.success("Filters cleared");
  };

  const fetchData = async () => {
    if (!clienteId) return;

    try {
      setLoading(true);

      // Fetch carriers, products, ciudades, and regiones for filters
      const [carriersRes, productsRes, ciudadesRes, regionesRes] = await Promise.all([
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
        supabase
          .from("ciudades")
          .select("id, nombre")
          .eq("cliente_id", clienteId)
          .eq("estado", "activo")
          .order("nombre"),
        supabase
          .from("regiones")
          .select("id, nombre")
          .eq("cliente_id", clienteId)
          .eq("estado", "activo")
          .order("nombre"),
      ]);

      setCarriers(carriersRes.data || []);
      setProducts(productsRes.data || []);
      setCiudades(ciudadesRes.data || []);
      setRegiones(regionesRes.data || []);

      // Fetch eventos reales with joins (including nodos)
      const { data, error } = await supabase
        .from("eventos_reales")
        .select(`
          *,
          carriers:carrier_id (
            legal_name,
            carrier_code,
            commercial_name,
            status
          ),
          productos_cliente:producto_id (
            nombre_producto,
            codigo_producto,
            standard_delivery_hours
          ),
          panelista_origen:panelistas!panelista_origen_id (
            nombre_completo
          ),
          panelista_destino:panelistas!panelista_destino_id (
            nombre_completo
          ),
          validado_por_usuario:usuarios!validado_por (
            nombre_completo
          ),
          nodo_origen_data:nodos!nodo_origen_id (
            id,
            codigo,
            ciudad_id,
            region_id,
            ciudad,
            ciudades (
              nombre,
              region_id,
              regiones (
                nombre
              )
            )
          ),
          nodo_destino_data:nodos!nodo_destino_id (
            id,
            codigo,
            ciudad_id,
            region_id,
            ciudad,
            ciudades (
              nombre,
              region_id,
              regiones (
                nombre
              )
            )
          )
        `)
        .eq("cliente_id", clienteId)
        .order("fecha_validacion", { ascending: false});

      if (error) throw error;

      setEventos(data || []);
    } catch (error: any) {
      console.error("Error fetching eventos reales:", error);
      toast.error("Error loading real events");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...eventos];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.id.toString().includes(search) ||
          e.allocation_plan_detail_id?.toString().includes(search) ||
          e.nodo_origen_data?.codigo?.toLowerCase().includes(search) ||
          e.nodo_destino_data?.codigo?.toLowerCase().includes(search) ||
          e.ciudad_origen?.toLowerCase().includes(search) ||
          e.ciudad_destino?.toLowerCase().includes(search) ||
          e.numero_etiqueta?.toLowerCase().includes(search) ||
          e.carriers?.legal_name?.toLowerCase().includes(search) ||
          e.productos_cliente?.nombre_producto?.toLowerCase().includes(search)
      );
    }

    // Carrier filter
    if (selectedCarrier !== "all") {
      filtered = filtered.filter((e) => e.carrier_id?.toString() === selectedCarrier);
    }

    // Product filter
    if (selectedProduct !== "all") {
      filtered = filtered.filter((e) => e.producto_id?.toString() === selectedProduct);
    }

    // Ciudad Origen filter
    if (selectedCiudadOrigen !== "all") {
      filtered = filtered.filter((e) => e.nodo_origen_data?.ciudad_id?.toString() === selectedCiudadOrigen);
    }

    // Ciudad Destino filter
    if (selectedCiudadDestino !== "all") {
      filtered = filtered.filter((e) => e.nodo_destino_data?.ciudad_id?.toString() === selectedCiudadDestino);
    }

    // Region Origen filter
    if (selectedRegionOrigen !== "all") {
      filtered = filtered.filter((e) => e.nodo_origen_data?.region_id?.toString() === selectedRegionOrigen);
    }

    // Region Destino filter
    if (selectedRegionDestino !== "all") {
      filtered = filtered.filter((e) => e.nodo_destino_data?.region_id?.toString() === selectedRegionDestino);
    }

    // Date range filter based on selected date type
    if (dateFrom || dateTo) {
      filtered = filtered.filter((e) => {
        let dateToCompare: string | null = null;
        
        switch (dateFilterType) {
          case "validation_date":
            dateToCompare = e.fecha_validacion;
            break;
          case "scheduled_date":
            dateToCompare = e.fecha_programada;
            break;
          case "sent_date":
            dateToCompare = e.fecha_envio_real;
            break;
          case "received_date":
            dateToCompare = e.fecha_recepcion_real;
            break;
        }

        if (!dateToCompare) return false;
        
        if (dateFrom && dateToCompare < dateFrom) return false;
        if (dateTo && dateToCompare > dateTo) return false;
        
        return true;
      });
    }

    setFilteredEventos(filtered);
  };

  const handleExport = () => {
    const exportData = filteredEventos.map((e) => ({
      ID: e.id,
      "Allocation Plan Detail ID": e.allocation_plan_detail_id || "N/A",
      Carrier: e.carriers?.legal_name || "N/A",
      "Carrier Code": e.carriers?.carrier_code || "N/A",
      Product: e.productos_cliente?.nombre_producto || "N/A",
      "Product Code": e.productos_cliente?.codigo_producto || "N/A",
      "Origin Node": e.nodo_origen_data?.codigo || "N/A",
      "Origin City": e.ciudad_origen || "N/A",
      "Destination Node": e.nodo_destino_data?.codigo || "N/A",
      "Destination City": e.ciudad_destino || "N/A",
      "Origin Panelist": e.panelista_origen?.nombre_completo || "N/A",
      "Destination Panelist": e.panelista_destino?.nombre_completo || "N/A",
      "Scheduled Date": e.fecha_programada || "N/A",
      "Sent Date": e.fecha_envio_real || "N/A",
      "Received Date": e.fecha_recepcion_real || "N/A",
      "Transit Days": e.tiempo_transito_dias || "N/A",
      "Transit Hours": e.tiempo_transito_horas || "N/A",
      "Tracking Number": e.numero_etiqueta || "N/A",
      "Validation Date": e.fecha_validacion,
      "Validated By": e.validado_por_usuario?.nombre_completo || "N/A",
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Real_Events_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Exported to CSV successfully");
  };

  const getPerformanceBadge = (transitDays: number | null, standardHours: number | null) => {
    if (!transitDays || !standardHours) return <Badge variant="outline">N/A</Badge>;
    
    const standardDays = standardHours / 24;
    const difference = transitDays - standardDays;
    
    if (Math.abs(difference) < 0.5) {
      return <Badge className="bg-green-500 text-white">On Time</Badge>;
    } else if (difference > 0) {
      // Delayed - show extra days in red
      const extraDays = Math.round(difference);
      return (
        <Badge className="bg-red-500 text-white">
          +{extraDays} {extraDays === 1 ? 'day' : 'days'}
        </Badge>
      );
    } else {
      // Early - show saved days in green
      const savedDays = Math.abs(Math.round(difference));
      return (
        <Badge className="bg-green-500 text-white">
          -{savedDays} {savedDays === 1 ? 'day' : 'days'}
        </Badge>
      );
    }
  };

  const calculateKPIs = () => {
    const total = filteredEventos.length;
    const avgTransit =
      filteredEventos.reduce((sum, e) => sum + (e.tiempo_transito_dias || 0), 0) / total || 0;
    const withinSLA = filteredEventos.filter((e) => (e.tiempo_transito_dias || 0) <= 5).length;
    const slaPercentage = total > 0 ? ((withinSLA / total) * 100).toFixed(1) : "0";

    return { total, avgTransit: avgTransit.toFixed(1), slaPercentage };
  };

  const kpis = calculateKPIs();

  const handleViewDetails = (evento: EventoReal) => {
    setSelectedEvent(evento);
    setDetailsDialogOpen(true);
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Real Events Database</h1>
          <p className="text-muted-foreground">Quality-assured events for reporting and analysis</p>
        </div>
        <Button onClick={handleExport} disabled={filteredEventos.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total}</div>
            <p className="text-xs text-muted-foreground">Validated quality events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transit Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgTransit} days</div>
            <p className="text-xs text-muted-foreground">Average delivery time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.slaPercentage}%</div>
            <p className="text-xs text-muted-foreground">Within 5-day target</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">Active products</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
              <SelectTrigger>
                <SelectValue placeholder="All Carriers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Carriers</SelectItem>
                {carriers.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.legal_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.nombre_producto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRegionOrigen} onValueChange={setSelectedRegionOrigen}>
              <SelectTrigger>
                <SelectValue placeholder="Origin Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Origin Regions</SelectItem>
                {regiones.map((r) => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCiudadOrigen} onValueChange={setSelectedCiudadOrigen}>
              <SelectTrigger>
                <SelectValue placeholder="Origin City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Origin Cities</SelectItem>
                {ciudades.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRegionDestino} onValueChange={setSelectedRegionDestino}>
              <SelectTrigger>
                <SelectValue placeholder="Dest. Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dest. Regions</SelectItem>
                {regiones.map((r) => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCiudadDestino} onValueChange={setSelectedCiudadDestino}>
              <SelectTrigger>
                <SelectValue placeholder="Dest. City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dest. Cities</SelectItem>
                {ciudades.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Filters Section */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">Date Filters</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Quick Date Filter */}
              <div className="space-y-2">
                <Label htmlFor="quick-date" className="text-xs text-muted-foreground">
                  Quick Filter
                </Label>
                <Select value={quickDateFilter} onValueChange={setQuickDateFilter}>
                  <SelectTrigger id="quick-date">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="date-type" className="text-xs text-muted-foreground">
                  Filter By
                </Label>
                <Select value={dateFilterType} onValueChange={setDateFilterType}>
                  <SelectTrigger id="date-type">
                    <SelectValue placeholder="Validation Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="validation_date">Validation Date</SelectItem>
                    <SelectItem value="scheduled_date">Scheduled Date</SelectItem>
                    <SelectItem value="sent_date">Sent Date</SelectItem>
                    <SelectItem value="received_date">Received Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* From Date */}
              <div className="space-y-2">
                <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                  From Date
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setQuickDateFilter("all");
                  }}
                />
              </div>

              {/* To Date */}
              <div className="space-y-2">
                <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                  To Date
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setQuickDateFilter("all");
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Events ({filteredEventos.length} {filteredEventos.length === 1 ? "event" : "events"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Transit</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Validated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEventos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No real events found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEventos.map((evento) => (
                    <TableRow key={evento.id}>
                      <TableCell className="font-mono">{evento.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {evento.carriers?.legal_name || evento.carrier_name || "N/A"}
                          </span>
                          {evento.carriers?.carrier_code && (
                            <span className="text-xs text-muted-foreground">
                              {evento.carriers.carrier_code}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {evento.productos_cliente?.nombre_producto || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>
                            {evento.nodo_origen_data?.ciudades?.regiones?.nombre || "N/A"} - {evento.nodo_origen_data?.ciudades?.nombre || "N/A"}
                          </span>
                          <span className="text-muted-foreground">↓</span>
                          <span>
                            {evento.nodo_destino_data?.ciudades?.regiones?.nombre || "N/A"} - {evento.nodo_destino_data?.ciudades?.nombre || "N/A"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(evento.fecha_programada), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {evento.tiempo_transito_dias ? `${evento.tiempo_transito_dias} days` : "N/A"}
                      </TableCell>
                      <TableCell>
                        {evento.productos_cliente?.standard_delivery_hours 
                          ? `${(evento.productos_cliente.standard_delivery_hours / 24).toFixed(1)} days`
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {getPerformanceBadge(
                          evento.tiempo_transito_dias, 
                          evento.productos_cliente?.standard_delivery_hours || null
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{format(new Date(evento.fecha_validacion), "MMM dd, yyyy")}</span>
                          {evento.validado_por_usuario && (
                            <span className="text-xs text-muted-foreground">
                              by {evento.validado_por_usuario.nombre_completo}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(evento)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <EventoRealDetailsDialog
        evento={selectedEvent}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
      </div>
    </AppLayout>
  );
}
