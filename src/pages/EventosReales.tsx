import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
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
import { Loader2, Download, Search, CheckCircle, TrendingUp, Clock, Package } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { format } from "date-fns";
import { EventoRealDetailsDialog } from "@/components/eventos-reales/EventoRealDetailsDialog";

interface EventoReal {
  id: number;
  envio_id: number;
  cliente_id: number;
  carrier_id: number | null;
  producto_id: number | null;
  nodo_origen: string;
  nodo_destino: string;
  panelista_origen_id: number | null;
  panelista_destino_id: number | null;
  fecha_programada: string;
  fecha_envio_real: string | null;
  fecha_recepcion_real: string | null;
  tiempo_transito_dias: number | null;
  numero_etiqueta: string | null;
  tipo_producto: string | null;
  carrier_name: string | null;
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
}

export default function EventosReales() {
  const { clienteId, loading: roleLoading } = useUserRole();
  const [eventos, setEventos] = useState<EventoReal[]>([]);
  const [filteredEventos, setFilteredEventos] = useState<EventoReal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [carriers, setCarriers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventoReal | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    if (!roleLoading && clienteId) {
      fetchData();
    }
  }, [roleLoading, clienteId]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedCarrier, selectedProduct, dateFrom, dateTo, eventos]);

  const fetchData = async () => {
    if (!clienteId) return;

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

      // Fetch eventos reales with joins
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
            codigo_producto
          ),
          panelista_origen:panelistas!panelista_origen_id (
            nombre_completo
          ),
          panelista_destino:panelistas!panelista_destino_id (
            nombre_completo
          ),
          validado_por_usuario:usuarios!validado_por (
            nombre_completo
          )
        `)
        .eq("cliente_id", clienteId)
        .order("fecha_validacion", { ascending: false });

      if (error) throw error;

      setEventos(data || []);
    } catch (error: any) {
      console.error("Error fetching eventos reales:", error);
      toast.error("Error loading validated events");
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
          e.envio_id.toString().includes(search) ||
          e.nodo_origen.toLowerCase().includes(search) ||
          e.nodo_destino.toLowerCase().includes(search) ||
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

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter((e) => e.fecha_validacion >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((e) => e.fecha_validacion <= dateTo);
    }

    setFilteredEventos(filtered);
  };

  const handleExport = () => {
    const exportData = filteredEventos.map((e) => ({
      ID: e.id,
      "Envio ID": e.envio_id,
      Carrier: e.carriers?.legal_name || e.carrier_name || "N/A",
      "Carrier Code": e.carriers?.carrier_code || "N/A",
      Product: e.productos_cliente?.nombre_producto || "N/A",
      "Product Code": e.productos_cliente?.codigo_producto || "N/A",
      "Origin Node": e.nodo_origen,
      "Destination Node": e.nodo_destino,
      "Origin Panelist": e.panelista_origen?.nombre_completo || "N/A",
      "Destination Panelist": e.panelista_destino?.nombre_completo || "N/A",
      "Scheduled Date": e.fecha_programada,
      "Sent Date": e.fecha_envio_real || "N/A",
      "Received Date": e.fecha_recepcion_real || "N/A",
      "Transit Days": e.tiempo_transito_dias || "N/A",
      "Tracking Number": e.numero_etiqueta || "N/A",
      "Product Type": e.tipo_producto || "N/A",
      "Validation Date": e.fecha_validacion,
      "Validated By": e.validado_por_usuario?.nombre_completo || "N/A",
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Validated_Events_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Exported to CSV successfully");
  };

  const getPerformanceBadge = (transitDays: number | null) => {
    if (!transitDays) return <Badge variant="outline">N/A</Badge>;
    
    if (transitDays <= 2) {
      return <Badge className="bg-green-500 text-white">Excellent</Badge>;
    } else if (transitDays <= 5) {
      return <Badge className="bg-blue-500 text-white">Normal</Badge>;
    } else if (transitDays <= 7) {
      return <Badge className="bg-yellow-500 text-white">Delayed</Badge>;
    } else {
      return <Badge className="bg-red-500 text-white">Very Delayed</Badge>;
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
          <h1 className="text-3xl font-bold">Validated Events Database</h1>
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
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From Date"
            />

            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To Date"
            />
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
                  <TableHead>Performance</TableHead>
                  <TableHead>Validated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEventos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No validated events found
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
                          <span>{evento.nodo_origen}</span>
                          <span className="text-muted-foreground">↓</span>
                          <span>{evento.nodo_destino}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(evento.fecha_programada), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {evento.tiempo_transito_dias ? `${evento.tiempo_transito_dias} days` : "N/A"}
                      </TableCell>
                      <TableCell>{getPerformanceBadge(evento.tiempo_transito_dias)}</TableCell>
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
