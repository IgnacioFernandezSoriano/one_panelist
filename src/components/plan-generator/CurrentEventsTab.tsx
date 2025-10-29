import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Filter } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Papa from "papaparse";
import { format } from "date-fns";

interface EnvioEvent {
  id: number;
  nodo_origen: string;
  nodo_destino: string;
  fecha_programada: string;
  estado: string;
  producto_id: number | null;
  producto_nombre: string | null;
}

const CurrentEventsTab = () => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<EnvioEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EnvioEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  
  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [searchOrigin, setSearchOrigin] = useState("");
  const [searchDestination, setSearchDestination] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [events, dateFrom, dateTo, selectedProduct, searchOrigin, searchDestination]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data: userData } = await supabase
        .from("usuarios")
        .select("cliente_id")
        .eq("email", user.email)
        .single();

      if (!userData?.cliente_id) throw new Error("No cliente_id found");

      // Fetch products
      const { data: productsData } = await supabase
        .from("productos_cliente")
        .select("*")
        .eq("cliente_id", userData.cliente_id)
        .eq("estado", "activo");

      setProducts(productsData || []);

      // Fetch envios with product info
      const { data: enviosData, error } = await supabase
        .from("envios")
        .select(`
          id,
          nodo_origen,
          nodo_destino,
          fecha_programada,
          estado,
          producto_id,
          productos_cliente (
            nombre_producto
          )
        `)
        .eq("cliente_id", userData.cliente_id)
        .order("fecha_programada", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const formatted = enviosData?.map(e => ({
        id: e.id,
        nodo_origen: e.nodo_origen,
        nodo_destino: e.nodo_destino,
        fecha_programada: e.fecha_programada,
        estado: e.estado,
        producto_id: e.producto_id,
        producto_nombre: (e.productos_cliente as any)?.nombre_producto || null,
      })) || [];

      setEvents(formatted);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error(t('common.error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    if (dateFrom) {
      filtered = filtered.filter(e => e.fecha_programada >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter(e => e.fecha_programada <= dateTo);
    }

    if (selectedProduct !== "all") {
      filtered = filtered.filter(e => e.producto_id?.toString() === selectedProduct);
    }

    if (searchOrigin) {
      filtered = filtered.filter(e => 
        e.nodo_origen.toLowerCase().includes(searchOrigin.toLowerCase())
      );
    }

    if (searchDestination) {
      filtered = filtered.filter(e => 
        e.nodo_destino.toLowerCase().includes(searchDestination.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  };

  const handleExport = () => {
    const csvData = filteredEvents.map(event => ({
      id: event.id,
      nodo_origen: event.nodo_origen,
      nodo_destino: event.nodo_destino,
      fecha_programada: event.fecha_programada,
      estado: event.estado,
      producto: event.producto_nombre || "",
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Current_Allocation_Events_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    toast.success(t('plan_generator.export_success'));
  };

  // Calculate statistics
  const stats = {
    total: filteredEvents.length,
    byProduct: products.map(p => ({
      name: p.nombre_producto,
      count: filteredEvents.filter(e => e.producto_id === p.id).length,
    })),
    byMonth: {} as Record<string, number>,
  };

  filteredEvents.forEach(event => {
    const month = event.fecha_programada.substring(0, 7); // YYYY-MM
    stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
  });

  if (loading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{t('plan_generator.current_events')}</h3>
        <Button size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          {t('plan_generator.export_csv')}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('plan_generator.total_events')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('plan_generator.by_product')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats.byProduct.slice(0, 3).map((item, idx) => (
                <div key={idx} className="text-sm flex justify-between">
                  <span className="truncate">{item.name}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('plan_generator.by_month')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(stats.byMonth).slice(0, 3).map(([month, count], idx) => (
                <div key={idx} className="text-sm flex justify-between">
                  <span>{month}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t('common.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t('common.date_from')}</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('common.date_to')}</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('product.label')}</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.nombre_producto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('envio.origin_node')}</label>
              <Input
                placeholder={t('common.search')}
                value={searchOrigin}
                onChange={(e) => setSearchOrigin(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('envio.destination_node')}</label>
              <Input
                placeholder={t('common.search')}
                value={searchDestination}
                onChange={(e) => setSearchDestination(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>{t('envio.origin_node')}</TableHead>
              <TableHead>{t('envio.destination_node')}</TableHead>
              <TableHead>{t('envio.scheduled_date')}</TableHead>
              <TableHead>{t('envio.status')}</TableHead>
              <TableHead>{t('product.label')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t('common.no_results')}
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.slice(0, 100).map((event) => (
                <TableRow key={`event-${event.id}`}>
                  <TableCell className="font-medium">{event.id}</TableCell>
                  <TableCell>{event.nodo_origen}</TableCell>
                  <TableCell>{event.nodo_destino}</TableCell>
                  <TableCell>{format(new Date(event.fecha_programada), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                      {event.estado}
                    </span>
                  </TableCell>
                  <TableCell>{event.producto_nombre || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {filteredEvents.length > 100 && (
          <div className="p-4 text-sm text-muted-foreground text-center border-t">
            Showing first 100 of {filteredEvents.length} results
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentEventsTab;
