import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import { Search, FileDown, Trash2, Copy, Edit2, Save, X } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface AllocationEvent {
  id: number;
  plan_id: number;
  plan_name: string;
  nodo_origen: string;
  nodo_destino: string;
  ciudad_origen: string;
  ciudad_destino: string;
  fecha_programada: string;
  producto_id: number;
  producto_codigo: string;
  producto_nombre: string;
  carrier_id: number;
  carrier_name: string;
  status: string;
  line_number: number;
}

interface FilterOptions {
  plans: Array<{ id: number; name: string }>;
  carriers: Array<{ id: number; name: string }>;
  products: Array<{ id: number; code: string; name: string }>;
}

export default function GeneratedAllocationPlans() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<AllocationEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [planFilter, setPlanFilter] = useState<string | undefined>(undefined);
  const [carrierFilter, setCarrierFilter] = useState<string | undefined>(undefined);
  const [productFilter, setProductFilter] = useState<string | undefined>(undefined);
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const { toast } = useToast();
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<AllocationEvent>>({});
  
  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState<string>("");
  const [bulkUpdateValue, setBulkUpdateValue] = useState<string>("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    plans: [],
    carriers: [],
    products: [],
  });

  useEffect(() => {
    loadEvents();
    loadFilterOptions();
    
    // Listen for import dialog event from menu
    const handleOpenImportDialog = () => {
      setImportDialogOpen(true);
    };
    
    window.addEventListener('openImportDialog', handleOpenImportDialog);
    
    return () => {
      window.removeEventListener('openImportDialog', handleOpenImportDialog);
    };
  }, []);

  const loadFilterOptions = async () => {
    try {
      // Load unique plans
      const { data: plansData } = await supabase
        .from("generated_allocation_plans")
        .select("id, plan_name")
        .order("plan_name");

      // Load carriers
      const { data: carriersData } = await supabase
        .from("carriers")
        .select("id, commercial_name")
        .order("commercial_name");

      // Load products
      const { data: productsData } = await supabase
        .from("productos_cliente")
        .select("id, codigo_producto, nombre_producto")
        .order("codigo_producto");

      setFilterOptions({
        plans: (plansData || []).map(p => ({ id: p.id, name: p.plan_name })),
        carriers: (carriersData || []).map(c => ({ id: c.id, name: c.commercial_name })),
        products: (productsData || []).map(p => ({ id: p.id, code: p.codigo_producto, name: p.nombre_producto })),
      });
    } catch (error) {
      console.error("Error loading filter options:", error);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("generated_allocation_plan_details")
        .select(`
          id,
          plan_id,
          nodo_origen,
          nodo_destino,
          fecha_programada,
          producto_id,
          carrier_id,
          generated_allocation_plans!inner (
            plan_name,
            status
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

      // Load all unique node codes
      const nodeCodes = new Set<string>();
      (data || []).forEach((item: any) => {
        if (item.nodo_origen) nodeCodes.add(item.nodo_origen);
        if (item.nodo_destino) nodeCodes.add(item.nodo_destino);
      });

      // Load city names for all nodes
      const { data: nodesData } = await supabase
        .from("nodos")
        .select(`
          codigo,
          ciudades (
            nombre
          )
        `)
        .in("codigo", Array.from(nodeCodes));

      // Create a map of node code to city name
      const nodeToCityMap = new Map<string, string>();
      (nodesData || []).forEach((node: any) => {
        nodeToCityMap.set(node.codigo, node.ciudades?.nombre || "Unknown");
      });

      const transformedEvents: AllocationEvent[] = (data || []).map((item: any, index: number) => ({
        id: item.id,
        plan_id: item.plan_id,
        plan_name: item.generated_allocation_plans?.plan_name || "N/A",
        nodo_origen: item.nodo_origen,
        nodo_destino: item.nodo_destino,
        ciudad_origen: nodeToCityMap.get(item.nodo_origen) || "Unknown",
        ciudad_destino: nodeToCityMap.get(item.nodo_destino) || "Unknown",
        fecha_programada: item.fecha_programada,
        producto_id: item.producto_id,
        producto_codigo: item.productos_cliente?.codigo_producto || "N/A",
        producto_nombre: item.productos_cliente?.nombre_producto || "N/A",
        carrier_id: item.carrier_id,
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredEvents.map(e => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id));
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const { error } = await supabase
        .from("generated_allocation_plan_details")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${selectedIds.length} event(s)`,
      });

      setSelectedIds([]);
      setDeleteDialogOpen(false);
      await loadEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDuplicateSelected = async () => {
    try {
      const eventsToDuplicate = events.filter(e => selectedIds.includes(e.id));
      
      const newEvents = eventsToDuplicate.map(event => ({
        plan_id: event.plan_id,
        nodo_origen: event.nodo_origen,
        nodo_destino: event.nodo_destino,
        fecha_programada: event.fecha_programada,
        producto_id: event.producto_id,
        carrier_id: event.carrier_id,
        cliente_id: 13, // TODO: Get from auth context
      }));

      const { error } = await supabase
        .from("generated_allocation_plan_details")
        .insert(newEvents);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Duplicated ${selectedIds.length} event(s)`,
      });

      setSelectedIds([]);
      await loadEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStartEdit = (event: AllocationEvent) => {
    setEditingId(event.id);
    setEditValues({
      nodo_origen: event.nodo_origen,
      nodo_destino: event.nodo_destino,
      fecha_programada: event.fecha_programada,
      carrier_id: event.carrier_id,
      producto_id: event.producto_id,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from("generated_allocation_plan_details")
        .update(editValues)
        .eq("id", editingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event updated successfully",
      });

      setEditingId(null);
      setEditValues({});
      await loadEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleBulkUpdate = async () => {
    if (!bulkUpdateField || !bulkUpdateValue) {
      toast({
        title: "Error",
        description: "Please select a field and enter a value",
        variant: "destructive",
      });
      return;
    }

    try {
      const updateData: any = {};
      updateData[bulkUpdateField] = bulkUpdateValue;

      const { error } = await supabase
        .from("generated_allocation_plan_details")
        .update(updateData)
        .in("id", selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedIds.length} event(s)`,
      });

      setSelectedIds([]);
      setBulkUpdateDialogOpen(false);
      setBulkUpdateField("");
      setBulkUpdateValue("");
      await loadEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // CSV Import functions
  const downloadTemplate = () => {
    const template = [
      {
        plan_name: "Example Plan 2025",
        nodo_origen: "MAD001",
        nodo_destino: "BCN001",
        fecha_programada: "2025-01-15",
        producto_codigo: "PROD001",
        carrier_name: "DHL",
        status: "PENDING"
      }
    ];
    
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'allocation_plan_import_template.csv';
    link.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      
      // Parse and preview CSV
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setCsvPreviewData(results.data.slice(0, 5)); // Show first 5 rows
        },
        error: (error) => {
          toast({
            title: "Error",
            description: `Failed to parse CSV: ${error.message}`,
            variant: "destructive",
          });
        }
      });
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) return;
    
    try {
      Papa.parse(csvFile, {
        header: true,
        complete: async (results) => {
          const rows = results.data.filter((row: any) => row.plan_name); // Filter empty rows
          
          if (rows.length === 0) {
            toast({
              title: "Error",
              description: "No valid data found in CSV",
              variant: "destructive",
            });
            return;
          }

          // Validate and prepare data
          const errors: string[] = [];
          const validRows: any[] = [];

          for (let i = 0; i < rows.length; i++) {
            const row: any = rows[i];
            const rowNum = i + 2; // +2 because of header and 0-index

            // Required fields validation
            if (!row.plan_name) errors.push(`Row ${rowNum}: plan_name is required`);
            if (!row.nodo_origen) errors.push(`Row ${rowNum}: nodo_origen is required`);
            if (!row.nodo_destino) errors.push(`Row ${rowNum}: nodo_destino is required`);
            if (!row.fecha_programada) errors.push(`Row ${rowNum}: fecha_programada is required`);
            if (!row.producto_codigo) errors.push(`Row ${rowNum}: producto_codigo is required`);
            if (!row.carrier_name) errors.push(`Row ${rowNum}: carrier_name is required`);

            if (errors.length === 0) {
              validRows.push(row);
            }
          }

          if (errors.length > 0) {
            toast({
              title: "Validation Errors",
              description: errors.slice(0, 5).join("; ") + (errors.length > 5 ? "..." : ""),
              variant: "destructive",
            });
            return;
          }

          // Get or create plan
          const planName = validRows[0].plan_name;
          let planId: number;

          const { data: existingPlan } = await supabase
            .from("generated_allocation_plans")
            .select("id")
            .eq("plan_name", planName)
            .single();

          if (existingPlan) {
            planId = existingPlan.id;
          } else {
            const { data: newPlan, error: planError } = await supabase
              .from("generated_allocation_plans")
              .insert({ plan_name: planName, status: "draft" })
              .select("id")
              .single();

            if (planError) throw planError;
            planId = newPlan.id;
          }

          // Prepare events for insertion
          const eventsToInsert = [];

          for (const row of validRows) {
            // Get producto_id from codigo
            const { data: producto } = await supabase
              .from("productos_cliente")
              .select("id")
              .eq("codigo_producto", row.producto_codigo)
              .single();

            if (!producto) {
              errors.push(`Product code ${row.producto_codigo} not found`);
              continue;
            }

            // Get carrier_id from name
            const { data: carrier } = await supabase
              .from("carriers")
              .select("id")
              .eq("commercial_name", row.carrier_name)
              .single();

            if (!carrier) {
              errors.push(`Carrier ${row.carrier_name} not found`);
              continue;
            }

            eventsToInsert.push({
              plan_id: planId,
              nodo_origen: row.nodo_origen,
              nodo_destino: row.nodo_destino,
              fecha_programada: row.fecha_programada,
              producto_id: producto.id,
              carrier_id: carrier.id,
              status: row.status || "PENDING",
            });
          }

          if (errors.length > 0) {
            toast({
              title: "Import Errors",
              description: errors.slice(0, 5).join("; ") + (errors.length > 5 ? "..." : ""),
              variant: "destructive",
            });
            return;
          }

          // Insert events
          const { error: insertError } = await supabase
            .from("generated_allocation_plan_details")
            .insert(eventsToInsert);

          if (insertError) throw insertError;

          toast({
            title: "Success",
            description: `Imported ${eventsToInsert.length} events successfully`,
          });

          setImportDialogOpen(false);
          setCsvFile(null);
          setCsvPreviewData([]);
          await loadEvents();
        },
        error: (error) => {
          toast({
            title: "Error",
            description: `Failed to parse CSV: ${error.message}`,
            variant: "destructive",
          });
        }
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
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

    const matchesStatus = !statusFilter || event.status === statusFilter;
    const matchesPlan = !planFilter || event.plan_id.toString() === planFilter;
    const matchesCarrier = !carrierFilter || event.carrier_id.toString() === carrierFilter;
    const matchesProduct = !productFilter || event.producto_id.toString() === productFilter;
    
    const matchesDateFrom = dateFromFilter === "" || event.fecha_programada >= dateFromFilter;
    const matchesDateTo = dateToFilter === "" || event.fecha_programada <= dateToFilter;

    return matchesSearch && matchesStatus && matchesPlan && matchesCarrier && matchesProduct && matchesDateFrom && matchesDateTo;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDING: "secondary",
      NOTIFIED: "outline",
      SENT: "default",
      RECEIVED: "default",
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

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={planFilter} onValueChange={(value) => setPlanFilter(value === "all" ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {filterOptions.plans.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={carrierFilter} onValueChange={(value) => setCarrierFilter(value === "all" ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All carriers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All carriers</SelectItem>
              {filterOptions.carriers.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={productFilter} onValueChange={(value) => setProductFilter(value === "all" ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {filterOptions.products.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.code} - {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === "all" ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="NOTIFIED">Notified</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="RECEIVED">Received</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input
              type="date"
              placeholder="From"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
            />
            <Input
              type="date"
              placeholder="To"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedIds.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDuplicateSelected}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate ({selectedIds.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkUpdateDialogOpen(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Bulk Update ({selectedIds.length})
                </Button>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExportCSV} variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredEvents.length)} of{" "}
          {filteredEvents.length} event(s)
          {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === filteredEvents.length && filteredEvents.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Line</TableHead>
                <TableHead>Plan Name</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading events...
                  </TableCell>
                </TableRow>
              ) : paginatedEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    No events found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEvents.map((event) => {
                  const isEditing = editingId === event.id;
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(event.id)}
                          onCheckedChange={(checked) => handleSelectOne(event.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">#{event.line_number}</TableCell>
                      <TableCell>{event.plan_name}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editValues.nodo_origen || ""}
                            onChange={(e) => setEditValues({ ...editValues, nodo_origen: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-medium">{event.nodo_origen}</span>
                            <span className="text-xs text-muted-foreground">{event.ciudad_origen}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editValues.nodo_destino || ""}
                            onChange={(e) => setEditValues({ ...editValues, nodo_destino: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-medium">{event.nodo_destino}</span>
                            <span className="text-xs text-muted-foreground">{event.ciudad_destino}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editValues.producto_id?.toString() || ""}
                            onValueChange={(value) => setEditValues({ ...editValues, producto_id: parseInt(value) })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {filterOptions.products.map(p => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                  {p.code} - {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium">{event.producto_codigo}</span>
                            <span className="text-sm text-muted-foreground">{event.producto_nombre}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editValues.carrier_id?.toString() || ""}
                            onValueChange={(value) => setEditValues({ ...editValues, carrier_id: parseInt(value) })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {filterOptions.carriers.map(c => (
                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          event.carrier_name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editValues.fecha_programada || ""}
                            onChange={(e) => setEditValues({ ...editValues, fecha_programada: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          format(new Date(event.fecha_programada), "MMM dd, yyyy")
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editValues.status || event.status}
                            onValueChange={(value) => setEditValues({ ...editValues, status: value })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="NOTIFIED">Notified</SelectItem>
                              <SelectItem value="SENT">Sent</SelectItem>
                              <SelectItem value="RECEIVED">Received</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          getStatusBadge(event.status)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleStartEdit(event)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedIds([event.id]);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedIds([event.id]);
                                handleDuplicateSelected();
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
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

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedIds.length} event(s). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSelected}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Update Dialog */}
        <Dialog open={bulkUpdateDialogOpen} onOpenChange={setBulkUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Update</DialogTitle>
              <DialogDescription>
                Update {selectedIds.length} selected event(s)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Field to update</Label>
                <Select value={bulkUpdateField} onValueChange={setBulkUpdateField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nodo_origen">Origin Node</SelectItem>
                    <SelectItem value="nodo_destino">Destination Node</SelectItem>
                    <SelectItem value="fecha_programada">Scheduled Date</SelectItem>
                    <SelectItem value="carrier_id">Carrier</SelectItem>
                    <SelectItem value="producto_id">Product</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>New value</Label>
                {bulkUpdateField === "fecha_programada" ? (
                  <Input
                    type="date"
                    value={bulkUpdateValue}
                    onChange={(e) => setBulkUpdateValue(e.target.value)}
                  />
                ) : bulkUpdateField === "carrier_id" ? (
                  <Select value={bulkUpdateValue} onValueChange={setBulkUpdateValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.carriers.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : bulkUpdateField === "producto_id" ? (
                  <Select value={bulkUpdateValue} onValueChange={setBulkUpdateValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.products.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.code} - {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : bulkUpdateField === "status" ? (
                  <Select value={bulkUpdateValue} onValueChange={setBulkUpdateValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="NOTIFIED">Notified</SelectItem>
                      <SelectItem value="SENT">Sent</SelectItem>
                      <SelectItem value="RECEIVED">Received</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={bulkUpdateValue}
                    onChange={(e) => setBulkUpdateValue(e.target.value)}
                    placeholder="Enter new value"
                  />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkUpdateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkUpdate}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import CSV Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Allocation Plan from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV file to import allocation events into the system
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Download the CSV template using the button below</li>
                  <li>Fill in your allocation events data following the template format</li>
                  <li>Required fields: plan_name, nodo_origen, nodo_destino, fecha_programada, producto_codigo, carrier_name</li>
                  <li>Optional fields: status (defaults to PENDING)</li>
                  <li>Upload the completed CSV file</li>
                  <li>Review the preview and click Import to complete</li>
                </ol>
              </div>

              {/* Template Download */}
              <div>
                <Button onClick={downloadTemplate} variant="outline" className="w-full">
                  <FileDown className="mr-2 h-4 w-4" />
                  Download CSV Template
                </Button>
              </div>

              {/* File Upload */}
              <div>
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="mt-2"
                />
              </div>

              {/* Preview */}
              {csvPreviewData.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Preview (first 5 rows):</h4>
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan Name</TableHead>
                          <TableHead>Origin</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Carrier</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvPreviewData.map((row: any, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.plan_name}</TableCell>
                            <TableCell>{row.nodo_origen}</TableCell>
                            <TableCell>{row.nodo_destino}</TableCell>
                            <TableCell>{row.fecha_programada}</TableCell>
                            <TableCell>{row.producto_codigo}</TableCell>
                            <TableCell>{row.carrier_name}</TableCell>
                            <TableCell>{row.status || "PENDING"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setImportDialogOpen(false);
                setCsvFile(null);
                setCsvPreviewData([]);
              }}>
                Cancel
              </Button>
              <Button onClick={handleImportCSV} disabled={!csvFile}>
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
