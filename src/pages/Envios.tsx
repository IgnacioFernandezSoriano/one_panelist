import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Upload, FileDown, Trash2, Copy, XCircle, Edit, MoreVertical, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
    status: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    loadEnvios();
  }, []);

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
      e.tipo_producto.toLowerCase().includes(searchLower) ||
      e.estado.toLowerCase().includes(searchLower) ||
      e.nodo_origen.toLowerCase().includes(searchLower) ||
      e.nodo_destino.toLowerCase().includes(searchLower) ||
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
      e.carrier_name === advancedFilters.carrier;
    
    const matchesProduct = !advancedFilters.product || 
      e.producto_id?.toString() === advancedFilters.product;
    
    const matchesType = !advancedFilters.type || 
      e.tipo_producto.toLowerCase() === advancedFilters.type.toLowerCase();
    
    const matchesOrigin = !advancedFilters.origin || 
      e.nodo_origen === advancedFilters.origin;
    
    const matchesDestination = !advancedFilters.destination || 
      e.nodo_destino === advancedFilters.destination;
    
    const matchesPanelist = !advancedFilters.panelist || 
      e.panelista_origen?.nombre_completo === advancedFilters.panelist ||
      e.panelista_destino?.nombre_completo === advancedFilters.panelist;
    
    const matchesStatus = !advancedFilters.status || 
      e.estado === advancedFilters.status;

    return matchesBasicSearch && matchesCarrier && matchesProduct && 
           matchesType && matchesOrigin && matchesDestination && 
           matchesPanelist && matchesStatus;
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
  ].filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(envios.map(e => e.estado).filter(Boolean)));

  const hasActiveFilters = Object.values(advancedFilters).some(v => v !== "");

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      carrier: "",
      product: "",
      type: "",
      origin: "",
      destination: "",
      panelist: "",
      status: ""
    });
  };

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
    if (selectedIds.length === filteredEnvios.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEnvios.map(e => e.id));
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
            <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-4 h-4" />
              Import CSV
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
                  checked={selectedIds.length === filteredEnvios.length && filteredEnvios.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  Select all {filteredEnvios.length} record(s)
                  {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
                </span>
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
          <div className="grid gap-4">
            {filteredEnvios.map((envio) => (
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
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                      {envio.clientes && (
                        <div>
                          <span className="text-muted-foreground">Account:</span>
                          <p className="font-medium">{envio.clientes.codigo}</p>
                          <p className="text-xs text-muted-foreground truncate">{envio.clientes.nombre}</p>
                        </div>
                      )}
                      
                      {envio.productos_cliente && (
                        <div>
                          <span className="text-muted-foreground">Product:</span>
                          <p className="font-medium">{envio.productos_cliente.codigo_producto}</p>
                          <p className="text-xs text-muted-foreground truncate">{envio.productos_cliente.nombre_producto}</p>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <p className="font-medium capitalize">{envio.tipo_producto}</p>
                      </div>
                      
                      {(envio.carriers || envio.carrier_name) && (
                        <div>
                          <span className="text-muted-foreground">Carrier:</span>
                          <p className="font-medium">
                            {envio.carriers?.carrier_code || envio.carrier_name}
                          </p>
                          {envio.carriers?.legal_name && (
                            <p className="text-xs text-muted-foreground truncate">{envio.carriers.legal_name}</p>
                          )}
                        </div>
                      )}
                      
                      <div>
                        <span className="text-muted-foreground">Origin:</span>
                        <p className="font-medium">{envio.nodo_origen}</p>
                        {envio.panelista_origen && (
                          <p className="text-xs text-muted-foreground truncate">{envio.panelista_origen.nombre_completo}</p>
                        )}
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Destination:</span>
                        <p className="font-medium">{envio.nodo_destino}</p>
                        {envio.panelista_destino && (
                          <p className="text-xs text-muted-foreground truncate">{envio.panelista_destino.nombre_completo}</p>
                        )}
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Scheduled:</span>
                        <p className="font-medium">
                          {format(new Date(envio.fecha_programada), "dd MMM yyyy", { locale: enUS })}
                        </p>
                      </div>
                      
                      {envio.fecha_limite && (
                        <div>
                          <span className="text-muted-foreground">Due date:</span>
                          <p className="font-medium">
                            {format(new Date(envio.fecha_limite), "dd MMM yyyy", { locale: enUS })}
                          </p>
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
                  value={advancedFilters.carrier}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, carrier: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All carriers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All carriers</SelectItem>
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
                  value={advancedFilters.product}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, product: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All products</SelectItem>
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
                  value={advancedFilters.type}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
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
                  value={advancedFilters.status}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
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
                  value={advancedFilters.origin}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, origin: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All origins" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All origins</SelectItem>
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
                  value={advancedFilters.destination}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, destination: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All destinations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All destinations</SelectItem>
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
                <Select
                  value={advancedFilters.panelist}
                  onValueChange={(value) => setAdvancedFilters({...advancedFilters, panelist: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All panelists" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All panelists</SelectItem>
                    {uniquePanelists.map((panelist) => (
                      <SelectItem key={panelist} value={panelist}>
                        {panelist}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
