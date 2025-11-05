import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import { Search, FileDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AllocationEvent {
  id: number;
  plan_id: number;
  plan_name: string;
  nodo_origen: string;
  nodo_destino: string;
  fecha_programada: string;
  producto_codigo: string;
  producto_nombre: string;
  carrier_name: string;
  status: string;
  line_number: number;
}

export default function GeneratedAllocationPlans() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<AllocationEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      // Load all events with plan, product, and carrier information
      const { data, error } = await supabase
        .from("generated_allocation_plan_details")
        .select(`
          id,
          plan_id,
          nodo_origen,
          nodo_destino,
          fecha_programada,
          generated_allocation_plans!inner (
            plan_name,
            status,
            carrier_id,
            producto_id
          ),
          productos_cliente!generated_allocation_plan_details_producto_id_fkey (
            codigo_producto,
            nombre_producto
          ),
          carriers!generated_allocation_plan_details_carrier_id_fkey (
            commercial_name
          )
        `)
        .order("fecha_programada", { ascending: true });

      if (error) throw error;

      // Transform data to flat structure with line numbers
      const transformedEvents: AllocationEvent[] = (data || []).map((item: any, index: number) => ({
        id: item.id,
        plan_id: item.plan_id,
        plan_name: item.generated_allocation_plans?.plan_name || "N/A",
        nodo_origen: item.nodo_origen,
        nodo_destino: item.nodo_destino,
        fecha_programada: item.fecha_programada,
        producto_codigo: item.productos_cliente?.codigo_producto || "N/A",
        producto_nombre: item.productos_cliente?.nombre_producto || "N/A",
        carrier_name: item.carriers?.commercial_name || "N/A",
        status: item.generated_allocation_plans?.status || "draft",
        line_number: index + 1,
      }));

      setEvents(transformedEvents);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load allocation events",
        variant: "destructive",
      });
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csvData = filteredEvents.map(event => ({
      Line: event.line_number,
      "Plan Name": event.plan_name,
      Origin: event.nodo_origen,
      Destination: event.nodo_destino,
      Product: `${event.producto_codigo} - ${event.producto_nombre}`,
      Carrier: event.carrier_name,
      "Scheduled Date": event.fecha_programada,
      Status: event.status,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `allocation-events-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${filteredEvents.length} events to CSV`,
    });
  };

  // Filter events
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      searchTerm === "" ||
      event.plan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.nodo_origen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.nodo_destino.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.producto_codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.carrier_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "" || event.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      merged: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Generated Allocation Plans</h1>
          <p className="text-muted-foreground">
            View and manage generated allocation events
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by plan, origin, destination, product, carrier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="merged">Merged</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleExportCSV} variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredEvents.length)} of{" "}
            {filteredEvents.length} event(s)
          </div>

          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(parseInt(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line</TableHead>
                <TableHead>Plan Name</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading events...
                  </TableCell>
                </TableRow>
              ) : paginatedEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No events found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">#{event.line_number}</TableCell>
                    <TableCell>{event.plan_name}</TableCell>
                    <TableCell className="font-mono text-sm">{event.nodo_origen}</TableCell>
                    <TableCell className="font-mono text-sm">{event.nodo_destino}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{event.producto_codigo}</span>
                        <span className="text-sm text-muted-foreground">
                          {event.producto_nombre}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{event.carrier_name}</TableCell>
                    <TableCell>{format(new Date(event.fecha_programada), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{getStatusBadge(event.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  return (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  );
                })
                .map((page, index, array) => (
                  <>
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span key={`ellipsis-${page}`}>...</span>
                    )}
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  </>
                ))}
            </div>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
