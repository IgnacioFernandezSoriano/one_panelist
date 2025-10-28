import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Upload, FileDown, Trash2, Copy, XCircle, Edit, MoreVertical, Filter, X, CalendarIcon, Check, ChevronsUpDown, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { CSVImporter } from "@/components/import/CSVImporter";

interface Envio {
  id: number;
  tipo_producto: string;
  estado: string;
  fecha_programada: string;
  fecha_limite?: string;
  nodo_origen: string;
  nodo_destino: string;
  carrier_name?: string;
  carrier_id?: number;
  cliente_id: number;
  producto_id?: number;
  panelista_origen_id?: number;
  panelista_destino_id?: number;
  numero_etiqueta?: string;
  fecha_envio_real?: string;
  fecha_recepcion_real?: string;
  tiempo_transito_dias?: number;
  carriers?: {
    legal_name: string;
    carrier_code?: string;
  };
  clientes?: {
    nombre: string;
    codigo: string;
  };
  productos_cliente?: {
    nombre_producto: string;
    codigo_producto: string;
  };
  panelista_origen?: {
    nombre_completo: string;
    nodo_asignado?: string;
  };
  panelista_destino?: {
    nombre_completo: string;
    nodo_asignado?: string;
  };
  nodo_origen_info?: {
    region_id?: number;
    ciudad_id?: number;
    regiones?: { id: number; nombre: string; codigo: string; };
    ciudades?: { id: number; nombre: string; codigo: string; };
  };
  nodo_destino_info?: {
    region_id?: number;
    ciudad_id?: number;
    regiones?: { id: number; nombre: string; codigo: string; };
    ciudades?: { id: number; nombre: string; codigo: string; };
  };
}

export default function Envios() {
  const navigate = useNavigate();
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    carrier: "",
    product: "",
    type: "",
    origin: "",
    destination: "",
    panelist: "",
    status: "",
    regionOrigen: "",
    regionDestino: "",
    ciudadOrigen: "",
    ciudadDestino: "",
    fechaProgramadaDesde: undefined as Date | undefined,
    fechaProgramadaHasta: undefined as Date | undefined,
    fechaEnvioDesde: undefined as Date | undefined,
    fechaEnvioHasta: undefined as Date | undefined
  });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [panelistSearchOpen, setPanelistSearchOpen] = useState(false);
  const [regiones, setRegiones] = useState<Array<{id: number, nombre: string, codigo: string}>>([]);
  const [ciudades, setCiudades] = useState<Array<{id: number, nombre: string, codigo: string}>>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadEnvios();
    loadRegionesYCiudades();
  }, []);

  // Listen for import dialog event from sidebar
  useEffect(() => {
    const handleOpenImportDialog = () => {
      setImportDialogOpen(true);
    };
    
    window.addEventListener('openImportDialog', handleOpenImportDialog);
    return () => window.removeEventListener('openImportDialog', handleOpenImportDialog);
  }, []);

  const loadRegionesYCiudades = async () => {
    try {
      const [regionesData, ciudadesData] = await Promise.all([
        supabase.from("regiones").select("id, nombre, codigo").eq("estado", "activo").order("nombre"),
        supabase.from("ciudades").select("id, nombre, codigo").eq("estado", "activo").order("nombre")
      ]);

      if (regionesData.data) setRegiones(regionesData.data);
      if (ciudadesData.data) setCiudades(ciudadesData.data);
    } catch (error: any) {
      console.error("Error loading regions/cities:", error);
    }
  };

  const loadEnvios = async () => {
    try {
      const { data, error } = await supabase
        .from("envios")
        .select(`
          *,
          carriers:carrier_id (
            legal_name,
            carrier_code
          ),
          clientes:cliente_id (
            nombre,
            codigo
          ),
          productos_cliente:producto_id (
            nombre_producto,
            codigo_producto
          ),
          panelista_origen:panelistas!panelista_origen_id (
            nombre_completo,
            nodo_asignado
          ),
          panelista_destino:panelistas!panelista_destino_id (
            nombre_completo,
            nodo_asignado
          ),
          nodo_origen_info:nodos!envios_nodo_origen_fkey (
            region_id,
            ciudad_id,
            regiones:region_id (id, nombre, codigo),
            ciudades:ciudad_id (id, nombre, codigo)
          ),
          nodo_destino_info:nodos!envios_nodo_destino_fkey (
            region_id,
            ciudad_id,
            regiones:region_id (id, nombre, codigo),
            ciudades:ciudad_id (id, nombre, codigo)
          )
        `)
        .order("fecha_programada", { ascending: false });

      if (error) throw error;
      setEnvios(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load shipments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportTopologyCSV = async () => {
    try {
      const { data, error } = await supabase
        .from("nodos")
        .select(`
          codigo,
          pais,
          estado,
          panelista_id,
          ciudades!inner (
            codigo,
            nombre,
            clasificacion,
            regiones!inner (
              codigo,
              nombre,
              clientes!inner (
                codigo,
                nombre
              )
            )
          )
        `)
        .eq("estado", "activo")
        .order("codigo");

      if (error) throw error;

      const csvData = data.map(nodo => ({
        cliente_codigo: nodo.ciudades.regiones.clientes.codigo,
        cliente_nombre: nodo.ciudades.regiones.clientes.nombre,
        region_codigo: nodo.ciudades.regiones.codigo,
        region_nombre: nodo.ciudades.regiones.nombre,
        ciudad_codigo: nodo.ciudades.codigo,
        ciudad_nombre: nodo.ciudades.nombre,
        ciudad_clasificacion: nodo.ciudades.clasificacion || '',
        nodo_codigo: nodo.codigo,
        nodo_pais: nodo.pais,
        nodo_estado: nodo.estado,
        tiene_panelista_activo: nodo.panelista_id ? 'SI' : 'NO',
        from_A: '',
        from_B: '',
        from_C: ''
      }));

      const uniqueClientCodes = [...new Set(csvData.map(n => n.cliente_codigo))];
      const accountId = uniqueClientCodes.length === 1 ? uniqueClientCodes[0] : 'Multiple';

      const csv = Papa.unparse(csvData, {
        quotes: true,
        header: true
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Topology_${accountId}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Topology CSV exported with ${csvData.length} nodes`,
      });

    } catch (error: any) {
      toast({
        title: "Export error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportAllocationPlanCSV = () => {
    try {
      const csvData = filteredEnvios.map(envio => ({
        id: envio.id,
        cliente_codigo: envio.clientes?.codigo || '',
        cliente_nombre: envio.clientes?.nombre || '',
        producto_codigo: envio.productos_cliente?.codigo_producto || '',
        producto_nombre: envio.productos_cliente?.nombre_producto || '',
        tipo_producto: envio.tipo_producto,
        carrier_code: envio.carriers?.carrier_code || '',
        carrier_name: envio.carriers?.legal_name || envio.carrier_name || '',
        nodo_origen: envio.nodo_origen,
        panelista_origen: envio.panelista_origen?.nombre_completo || '',
        nodo_destino: envio.nodo_destino,
        panelista_destino: envio.panelista_destino?.nombre_completo || '',
        fecha_programada: envio.fecha_programada,
        fecha_limite: envio.fecha_limite || '',
        estado: envio.estado,
        numero_etiqueta: envio.numero_etiqueta || '',
        fecha_envio_real: envio.fecha_envio_real || '',
        fecha_recepcion_real: envio.fecha_recepcion_real || '',
        tiempo_transito_dias: envio.tiempo_transito_dias || ''
      }));

      const uniqueClientCodes = [...new Set(csvData.map(e => e.cliente_codigo).filter(Boolean))];
      const accountId = uniqueClientCodes.length === 1 ? uniqueClientCodes[0] : 'Multiple';

      const csv = Papa.unparse(csvData, {
        quotes: true,
        header: true
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Allocation Plan_${accountId}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Allocation plan exported with ${csvData.length} records`,
      });

    } catch (error: any) {
      toast({
        title: "Export error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredEnvios = envios.filter((e) => {
    const searchLower = searchTerm.toLowerCase();
    
    // Basic text search
    const matchesBasicSearch = !searchTerm || (
      e.id.toString().includes(searchTerm) ||
      (e.tipo_producto && e.tipo_producto.toLowerCase().includes(searchLower)) ||
      (e.estado && e.estado.toLowerCase().includes(searchLower)) ||
      (e.nodo_origen && e.nodo_origen.toLowerCase().includes(searchLower)) ||
      (e.nodo_destino && e.nodo_destino.toLowerCase().includes(searchLower)) ||
      (e.numero_etiqueta && e.numero_etiqueta.toLowerCase().includes(searchLower)) ||
      (e.carrier_name && e.carrier_name.toLowerCase().includes(searchLower)) ||
      (e.carriers?.legal_name && e.carriers.legal_name.toLowerCase().includes(searchLower)) ||
      (e.carriers?.carrier_code && e.carriers.carrier_code.toLowerCase().includes(searchLower)) ||
      (e.clientes?.nombre && e.clientes.nombre.toLowerCase().includes(searchLower)) ||
      (e.clientes?.codigo && e.clientes.codigo.toLowerCase().includes(searchLower)) ||
      (e.productos_cliente?.nombre_producto && e.productos_cliente.nombre_producto.toLowerCase().includes(searchLower)) ||
      (e.productos_cliente?.codigo_producto && e.productos_cliente.codigo_producto.toLowerCase().includes(searchLower)) ||
      (e.panelista_origen?.nombre_completo && e.panelista_origen.nombre_completo.toLowerCase().includes(searchLower)) ||
      (e.panelista_origen?.nodo_asignado && e.panelista_origen.nodo_asignado.toLowerCase().includes(searchLower)) ||
      (e.panelista_destino?.nombre_completo && e.panelista_destino.nombre_completo.toLowerCase().includes(searchLower)) ||
      (e.panelista_destino?.nodo_asignado && e.panelista_destino.nodo_asignado.toLowerCase().includes(searchLower))
    );

    // Advanced filters
    const matchesCarrier = !advancedFilters.carrier || 
      e.carrier_id?.toString() === advancedFilters.carrier ||
      e.carrier_name === advancedFilters.carrier ||
      e.carriers?.legal_name === advancedFilters.carrier;
    
    const matchesProduct = !advancedFilters.product || 
      e.productos_cliente?.nombre_producto === advancedFilters.product;
    
    const matchesType = !advancedFilters.type || 
      (e.tipo_producto && e.tipo_producto.toLowerCase() === advancedFilters.type.toLowerCase());
    
    const matchesOrigin = !advancedFilters.origin || 
      e.nodo_origen === advancedFilters.origin;
    
    const matchesDestination = !advancedFilters.destination || 
      e.nodo_destino === advancedFilters.destination;
    
    const matchesPanelist = !advancedFilters.panelist || 
      e.panelista_origen?.nombre_completo === advancedFilters.panelist ||
      e.panelista_destino?.nombre_completo === advancedFilters.panelist;
    
    const matchesStatus = !advancedFilters.status || 
      e.estado === advancedFilters.status;
    
    const matchesRegionOrigen = !advancedFilters.regionOrigen || 
      e.nodo_origen_info?.regiones?.id?.toString() === advancedFilters.regionOrigen;
    
    const matchesRegionDestino = !advancedFilters.regionDestino || 
      e.nodo_destino_info?.regiones?.id?.toString() === advancedFilters.regionDestino;
    
    const matchesCiudadOrigen = !advancedFilters.ciudadOrigen || 
      e.nodo_origen_info?.ciudades?.id?.toString() === advancedFilters.ciudadOrigen;
    
    const matchesCiudadDestino = !advancedFilters.ciudadDestino || 
      e.nodo_destino_info?.ciudades?.id?.toString() === advancedFilters.ciudadDestino;
    
    // Date filters
    const matchesFechaProgramadaDesde = !advancedFilters.fechaProgramadaDesde ||
      new Date(e.fecha_programada) >= advancedFilters.fechaProgramadaDesde;
    
    const matchesFechaProgramadaHasta = !advancedFilters.fechaProgramadaHasta ||
      new Date(e.fecha_programada) <= advancedFilters.fechaProgramadaHasta;
    
    const matchesFechaEnvioDesde = !advancedFilters.fechaEnvioDesde ||
      (e.fecha_envio_real && new Date(e.fecha_envio_real) >= advancedFilters.fechaEnvioDesde);
    
    const matchesFechaEnvioHasta = !advancedFilters.fechaEnvioHasta ||
      (e.fecha_envio_real && new Date(e.fecha_envio_real) <= advancedFilters.fechaEnvioHasta);

    return matchesBasicSearch && matchesCarrier && matchesProduct && 
           matchesType && matchesOrigin && matchesDestination && 
           matchesPanelist && matchesStatus && matchesRegionOrigen && matchesRegionDestino &&
           matchesCiudadOrigen && matchesCiudadDestino &&
           matchesFechaProgramadaDesde && matchesFechaProgramadaHasta &&
           matchesFechaEnvioDesde && matchesFechaEnvioHasta;
  });

  // Get unique values for filters
  const uniqueCarriers = Array.from(new Set(envios.map(e => e.carriers?.legal_name || e.carrier_name).filter(Boolean)));
  const uniqueProducts = Array.from(new Set(envios.map(e => e.productos_cliente?.nombre_producto).filter(Boolean)));
  const uniqueTypes = Array.from(new Set(envios.map(e => e.tipo_producto).filter(Boolean)));
  const uniqueOrigins = Array.from(new Set(envios.map(e => e.nodo_origen).filter(Boolean))).sort();
  const uniqueDestinations = Array.from(new Set(envios.map(e => e.nodo_destino).filter(Boolean))).sort();
  const uniquePanelists = Array.from(new Set([
    ...envios.map(e => e.panelista_origen?.nombre_completo),
    ...envios.map(e => e.panelista_destino?.nombre_completo)
  ].filter(Boolean))).sort((a, b) => {
    // Sort by last name (assuming format "FirstName LastName")
    const lastNameA = a.split(' ').slice(-1)[0].toLowerCase();
    const lastNameB = b.split(' ').slice(-1)[0].toLowerCase();
    return lastNameA.localeCompare(lastNameB);
  });
  const uniqueStatuses = Array.from(new Set(envios.map(e => e.estado).filter(Boolean)));

  const hasActiveFilters = Object.values(advancedFilters).some(v => v !== "" && v !== undefined);

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      carrier: "",
      product: "",
      type: "",
      origin: "",
      destination: "",
      panelist: "",
      status: "",
      regionOrigen: "",
      regionDestino: "",
      ciudadOrigen: "",
      ciudadDestino: "",
      fechaProgramadaDesde: undefined,
      fechaProgramadaHasta: undefined,
      fechaEnvioDesde: undefined,
      fechaEnvioHasta: undefined
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredEnvios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEnvios = filteredEnvios.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, advancedFilters, itemsPerPage]);

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
      PENDING: { variant: "outline" },
      NOTIFIED: { variant: "secondary" },
      SENT: { variant: "default" },
      RECEIVED: { variant: "default", className: "bg-success text-success-foreground" },
      CANCELLED: { variant: "destructive" },
    };
    return variants[estado] || { variant: "secondary" };
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedEnvios.length && paginatedEnvios.length > 0) {
      // Deselect all items on current page
      setSelectedIds(prev => prev.filter(id => !paginatedEnvios.find(e => e.id === id)));
    } else {
      // Select all items on current page
      const pageIds = paginatedEnvios.map(e => e.id);
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const { error } = await supabase
        .from("envios")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast({
        title: "Deleted successfully",
        description: `${selectedIds.length} record(s) deleted`,
      });

      setSelectedIds([]);
      loadEnvios();
    } catch (error: any) {
      toast({
        title: "Error deleting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleDuplicateSelected = async () => {
    try {
      const selectedEnvios = envios.filter(e => selectedIds.includes(e.id));
      
      const duplicates = selectedEnvios.map(envio => ({
        cliente_id: envio.cliente_id,
        nodo_origen: envio.nodo_origen,
        nodo_destino: envio.nodo_destino,
        fecha_programada: envio.fecha_programada,
        fecha_limite: envio.fecha_limite,
        tipo_producto: envio.tipo_producto,
        estado: "PENDING" as const,
        carrier_id: envio.carrier_id,
        carrier_name: envio.carrier_name,
        producto_id: envio.producto_id,
        panelista_origen_id: envio.panelista_origen_id,
        panelista_destino_id: envio.panelista_destino_id,
        motivo_creacion: "programado",
      }));

      const { error } = await supabase
        .from("envios")
        .insert(duplicates);

      if (error) throw error;

      toast({
        title: "Duplicated successfully",
        description: `${selectedIds.length} record(s) duplicated`,
      });

      setSelectedIds([]);
      loadEnvios();
    } catch (error: any) {
      toast({
        title: "Error duplicating",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelSelected = async () => {
    try {
      const { error } = await supabase
        .from("envios")
        .update({ estado: "CANCELLED" })
        .in("id", selectedIds);

      if (error) throw error;

      toast({
        title: "Updated successfully",
        description: `${selectedIds.length} record(s) marked as cancelled`,
      });

      setSelectedIds([]);
      loadEnvios();
    } catch (error: any) {
      toast({
        title: "Error updating",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCancelDialogOpen(false);
    }
  };

  const handleDuplicateOne = async (id: number) => {
    try {
      const envio = envios.find(e => e.id === id);
      if (!envio) return;

      const duplicate = {
        cliente_id: envio.cliente_id,
        nodo_origen: envio.nodo_origen,
        nodo_destino: envio.nodo_destino,
        fecha_programada: envio.fecha_programada,
        fecha_limite: envio.fecha_limite,
        tipo_producto: envio.tipo_producto,
        estado: "PENDING" as const,
        carrier_id: envio.carrier_id,
        carrier_name: envio.carrier_name,
        producto_id: envio.producto_id,
        panelista_origen_id: envio.panelista_origen_id,
        panelista_destino_id: envio.panelista_destino_id,
        motivo_creacion: "programado",
      };

      const { error } = await supabase
        .from("envios")
        .insert([duplicate]);

      if (error) throw error;

      toast({
        title: "Duplicated successfully",
        description: "Record has been duplicated",
      });

      loadEnvios();
    } catch (error: any) {
      toast({
        title: "Error duplicating",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteOne = async () => {
    if (!deleteItemId) return;

    try {
      const { error } = await supabase
        .from("envios")
        .delete()
        .eq("id", deleteItemId);

      if (error) throw error;

      toast({
        title: "Deleted successfully",
        description: "Record has been deleted",
      });

      loadEnvios();
    } catch (error: any) {
      toast({
        title: "Error deleting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteItemId(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Allocation Plan</h1>
            <p className="text-muted-foreground">
              Manage shipping plans and tracking
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportTopologyCSV}>
              <FileDown className="w-4 h-4" />
              Export Topology CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportAllocationPlanCSV}>
              <FileDown className="w-4 h-4" />
              Export Allocation Plan
            </Button>
            <Button className="gap-2" onClick={() => navigate("/envios/nuevo")}>
              <Plus className="w-4 h-4" />
              Allocation Event
            </Button>
          </div>
        </div>

        <Card className="p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search by ID, account, product, carrier, panelist name, node, label..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-muted-foreground">
              Search across all fields: accounts, products, carriers, panelists, nodes, and tracking labels
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setAdvancedSearchOpen(true)}
            >
              <Filter className="w-4 h-4" />
              Advanced Search
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">
                  {Object.values(advancedFilters).filter(v => v).length}
                </Badge>
              )}
            </Button>
          </div>
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
              {advancedFilters.carrier && (
                <Badge variant="secondary" className="gap-1">
                  Carrier: {uniqueCarriers.find(c => c === advancedFilters.carrier)}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, carrier: ""})} />
                </Badge>
              )}
              {advancedFilters.product && (
                <Badge variant="secondary" className="gap-1">
                  Product: {uniqueProducts.find(p => p === advancedFilters.product)}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, product: ""})} />
                </Badge>
              )}
              {advancedFilters.type && (
                <Badge variant="secondary" className="gap-1">
                  Type: {advancedFilters.type}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, type: ""})} />
                </Badge>
              )}
              {advancedFilters.origin && (
                <Badge variant="secondary" className="gap-1">
                  Origin: {advancedFilters.origin}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, origin: ""})} />
                </Badge>
              )}
              {advancedFilters.destination && (
                <Badge variant="secondary" className="gap-1">
                  Destination: {advancedFilters.destination}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, destination: ""})} />
                </Badge>
              )}
              {advancedFilters.panelist && (
                <Badge variant="secondary" className="gap-1">
                  Panelist: {uniquePanelists.find(p => p === advancedFilters.panelist)}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, panelist: ""})} />
                </Badge>
              )}
              {advancedFilters.status && (
                <Badge variant="secondary" className="gap-1">
                  Status: {advancedFilters.status}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, status: ""})} />
                </Badge>
              )}
              {advancedFilters.regionOrigen && (
                <Badge variant="secondary" className="gap-1">
                  Origin Region: {regiones.find(r => r.id.toString() === advancedFilters.regionOrigen)?.nombre}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, regionOrigen: ""})} />
                </Badge>
              )}
              {advancedFilters.regionDestino && (
                <Badge variant="secondary" className="gap-1">
                  Dest. Region: {regiones.find(r => r.id.toString() === advancedFilters.regionDestino)?.nombre}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, regionDestino: ""})} />
                </Badge>
              )}
              {advancedFilters.ciudadOrigen && (
                <Badge variant="secondary" className="gap-1">
                  Origin City: {ciudades.find(c => c.id.toString() === advancedFilters.ciudadOrigen)?.nombre}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, ciudadOrigen: ""})} />
                </Badge>
              )}
              {advancedFilters.ciudadDestino && (
                <Badge variant="secondary" className="gap-1">
                  Dest. City: {ciudades.find(c => c.id.toString() === advancedFilters.ciudadDestino)?.nombre}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, ciudadDestino: ""})} />
                </Badge>
              )}
              {advancedFilters.fechaProgramadaDesde && (
                <Badge variant="secondary" className="gap-1">
                  Scheduled from: {format(advancedFilters.fechaProgramadaDesde, "dd MMM yyyy")}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, fechaProgramadaDesde: undefined})} />
                </Badge>
              )}
              {advancedFilters.fechaProgramadaHasta && (
                <Badge variant="secondary" className="gap-1">
                  Scheduled until: {format(advancedFilters.fechaProgramadaHasta, "dd MMM yyyy")}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, fechaProgramadaHasta: undefined})} />
                </Badge>
              )}
              {advancedFilters.fechaEnvioDesde && (
                <Badge variant="secondary" className="gap-1">
                  Sent from: {format(advancedFilters.fechaEnvioDesde, "dd MMM yyyy")}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, fechaEnvioDesde: undefined})} />
                </Badge>
              )}
              {advancedFilters.fechaEnvioHasta && (
                <Badge variant="secondary" className="gap-1">
                  Sent until: {format(advancedFilters.fechaEnvioHasta, "dd MMM yyyy")}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setAdvancedFilters({...advancedFilters, fechaEnvioHasta: undefined})} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearAdvancedFilters}>
                Clear all
              </Button>
            </div>
          )}
        </Card>

        {filteredEnvios.length > 0 && (
          <Card className="p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedIds.length === paginatedEnvios.length && paginatedEnvios.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredEnvios.length)} of {filteredEnvios.length} record(s)
                  {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
                </span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => setItemsPerPage(parseInt(value))}
                >
                  <SelectTrigger className="w-[120px] h-8">
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
              {selectedIds.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleDuplicateSelected}
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading allocation plans...</p>
          </div>
        ) : filteredEnvios.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No allocation plans found</p>
          </Card>
        ) : (
          <>
            <div className="grid gap-4">
              {paginatedEnvios.map((envio) => (
              <Card key={envio.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedIds.includes(envio.id)}
                    onCheckedChange={() => toggleSelection(envio.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        #{envio.id}
                        {envio.numero_etiqueta && <span className="text-muted-foreground font-normal"> • {envio.numero_etiqueta}</span>}
                      </h3>
                      <Badge 
                        variant={getEstadoBadge(envio.estado).variant}
                        className={getEstadoBadge(envio.estado).className}
                      >
                        {envio.estado}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                      {envio.clientes && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">Account:</span>
                          <p className="font-medium">{envio.clientes.codigo}</p>
                          <span className="text-muted-foreground">•</span>
                          <p className="text-xs text-muted-foreground">{envio.clientes.nombre}</p>
                        </div>
                      )}
                      
                      {envio.productos_cliente && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">Product:</span>
                          <p className="font-medium">{envio.productos_cliente.codigo_producto}</p>
                          <span className="text-muted-foreground">•</span>
                          <p className="text-xs text-muted-foreground">{envio.productos_cliente.nombre_producto}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-xs">Type:</span>
                        <p className="font-medium capitalize">{envio.tipo_producto}</p>
                      </div>
                      
                      {(envio.carriers || envio.carrier_name) && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">Carrier:</span>
                          <p className="font-medium">{envio.carriers?.carrier_code || envio.carrier_name}</p>
                          {envio.carriers?.legal_name && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <p className="text-xs text-muted-foreground">{envio.carriers.legal_name}</p>
                            </>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-xs">Origin:</span>
                        <p className="font-medium">{envio.nodo_origen}</p>
                        {envio.panelista_origen && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground">{envio.panelista_origen.nombre_completo}</p>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-xs">Destination:</span>
                        <p className="font-medium">{envio.nodo_destino}</p>
                        {envio.panelista_destino && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground">{envio.panelista_destino.nombre_completo}</p>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-xs">Scheduled:</span>
                        <p className="font-medium">{format(new Date(envio.fecha_programada), "dd MMM yyyy", { locale: enUS })}</p>
                      </div>
                      
                      {envio.fecha_limite && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">Due:</span>
                          <p className="font-medium">{format(new Date(envio.fecha_limite), "dd MMM yyyy", { locale: enUS })}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => navigate(`/envios/${envio.id}`)}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDuplicateOne(envio.id)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteItemId(envio.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
            </div>

            {totalPages > 1 && (
              <Card className="p-4 mt-6">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete selected records?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. {selectedIds.length} record(s) will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteItemId !== null} onOpenChange={() => setDeleteItemId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete record?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This record will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteOne} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as cancelled?</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedIds.length} record(s) will be marked as CANCELLED.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelSelected}>
                Mark as Cancelled
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={advancedSearchOpen} onOpenChange={setAdvancedSearchOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Advanced Search</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Carrier</Label>
                <Select
                  value={advancedFilters.carrier || "ALL"}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, carrier: value === "ALL" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All carriers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All carriers</SelectItem>
                    {uniqueCarriers.map((carrier) => (
                      <SelectItem key={carrier} value={carrier}>
                        {carrier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Product</Label>
                <Select
                  value={advancedFilters.product || "ALL"}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, product: value === "ALL" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All products</SelectItem>
                    {uniqueProducts.map((product) => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={advancedFilters.type || "ALL"}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, type: value === "ALL" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All types</SelectItem>
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={advancedFilters.status || "ALL"}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, status: value === "ALL" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {uniqueStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Origin Node</Label>
                <Select
                  value={advancedFilters.origin || "ALL"}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, origin: value === "ALL" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All origins" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All origins</SelectItem>
                    {uniqueOrigins.map((origin) => (
                      <SelectItem key={origin} value={origin}>
                        {origin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Destination Node</Label>
                <Select
                  value={advancedFilters.destination || "ALL"}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, destination: value === "ALL" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All destinations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All destinations</SelectItem>
                    {uniqueDestinations.map((dest) => (
                      <SelectItem key={dest} value={dest}>
                        {dest}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Panelist (Origin or Destination)</Label>
                <Popover open={panelistSearchOpen} onOpenChange={setPanelistSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={panelistSearchOpen}
                      className="w-full justify-between"
                    >
                      {advancedFilters.panelist || "All panelists"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Search panelist..." />
                      <CommandList>
                        <CommandEmpty>No panelist found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="ALL"
                            onSelect={() => {
                              setAdvancedFilters({...advancedFilters, panelist: ""});
                              setPanelistSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !advancedFilters.panelist ? "opacity-100" : "opacity-0"
                              )}
                            />
                            All panelists
                          </CommandItem>
                          {uniquePanelists.map((panelist) => (
                            <CommandItem
                              key={panelist}
                              value={panelist}
                              onSelect={(value) => {
                                setAdvancedFilters({...advancedFilters, panelist: value === advancedFilters.panelist ? "" : value});
                                setPanelistSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  advancedFilters.panelist === panelist ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {panelist}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Origin Region</Label>
                <Select
                  value={advancedFilters.regionOrigen || "ALL"}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, regionOrigen: value === "ALL" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All origin regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All origin regions</SelectItem>
                    {regiones.map((region) => (
                      <SelectItem key={region.id} value={region.id.toString()}>
                        {region.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Destination Region</Label>
                <Select
                  value={advancedFilters.regionDestino || "ALL"}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, regionDestino: value === "ALL" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All destination regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All destination regions</SelectItem>
                    {regiones.map((region) => (
                      <SelectItem key={region.id} value={region.id.toString()}>
                        {region.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Origin City</Label>
                <Select
                  value={advancedFilters.ciudadOrigen || "ALL"}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, ciudadOrigen: value === "ALL" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All origin cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All origin cities</SelectItem>
                    {ciudades.map((ciudad) => (
                      <SelectItem key={ciudad.id} value={ciudad.id.toString()}>
                        {ciudad.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Destination City</Label>
                <Select
                  value={advancedFilters.ciudadDestino || "ALL"}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, ciudadDestino: value === "ALL" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All destination cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All destination cities</SelectItem>
                    {ciudades.map((ciudad) => (
                      <SelectItem key={ciudad.id} value={ciudad.id.toString()}>
                        {ciudad.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scheduled Date From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !advancedFilters.fechaProgramadaDesde && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {advancedFilters.fechaProgramadaDesde ? format(advancedFilters.fechaProgramadaDesde, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={advancedFilters.fechaProgramadaDesde}
                      onSelect={(date) => setAdvancedFilters({...advancedFilters, fechaProgramadaDesde: date})}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Scheduled Date Until</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !advancedFilters.fechaProgramadaHasta && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {advancedFilters.fechaProgramadaHasta ? format(advancedFilters.fechaProgramadaHasta, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={advancedFilters.fechaProgramadaHasta}
                      onSelect={(date) => setAdvancedFilters({...advancedFilters, fechaProgramadaHasta: date})}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Sent Date From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !advancedFilters.fechaEnvioDesde && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {advancedFilters.fechaEnvioDesde ? format(advancedFilters.fechaEnvioDesde, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={advancedFilters.fechaEnvioDesde}
                      onSelect={(date) => setAdvancedFilters({...advancedFilters, fechaEnvioDesde: date})}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Sent Date Until</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !advancedFilters.fechaEnvioHasta && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {advancedFilters.fechaEnvioHasta ? format(advancedFilters.fechaEnvioHasta, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={advancedFilters.fechaEnvioHasta}
                      onSelect={(date) => setAdvancedFilters({...advancedFilters, fechaEnvioHasta: date})}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={clearAdvancedFilters}>
                Clear Filters
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAdvancedSearchOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setAdvancedSearchOpen(false)}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Allocation Plans</DialogTitle>
            </DialogHeader>
            <CSVImporter
              tableName="envios"
              tableLabel="Allocation Plans"
              expectedColumns={[
                "cliente_id",
                "carrier_id",
                "producto_id",
                "panelista_origen_id",
                "panelista_destino_id",
                "nodo_origen",
                "nodo_destino",
                "fecha_programada",
                "tipo_producto",
                "estado",
                "motivo_creacion"
              ]}
              exampleData={[
                {
                  cliente_id: "1",
                  carrier_id: "1",
                  producto_id: "2",
                  panelista_origen_id: "5",
                  panelista_destino_id: "8",
                  nodo_origen: "MAD",
                  nodo_destino: "BCN",
                  fecha_programada: "2025-01-15",
                  tipo_producto: "letter",
                  estado: "PENDING",
                  motivo_creacion: "scheduled"
                },
              ]}
              onImportComplete={() => {
                setImportDialogOpen(false);
                loadEnvios();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
