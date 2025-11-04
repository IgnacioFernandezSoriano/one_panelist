import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, ArrowUpRight, ArrowDownLeft, Search, Filter, X } from "lucide-react";
import { format } from "date-fns";

interface Envio {
  id: number;
  nodo_origen: string;
  nodo_destino: string;
  producto_id: number;
  fecha_programada: string;
  numero_etiqueta: string | null;
  carrier_id: number | null;
  panelista_origen_id?: number | null;
  panelista_destino_id?: number | null;
  productos_cliente?: {
    nombre_producto: string;
  };
  carriers?: {
    legal_name: string;
  };
  panelista_origen?: {
    nombre_completo: string;
  };
  panelista_destino?: {
    nombre_completo: string;
  };
}

export default function RegistrarEnvioRecepcion() {
  const { clienteId } = useUserRole();
  const { toast } = useToast();
  
  // Eventos disponibles
  const [eventosEnvio, setEventosEnvio] = useState<Envio[]>([]);
  const [eventosRecepcion, setEventosRecepcion] = useState<Envio[]>([]);
  const [filteredEventosEnvio, setFilteredEventosEnvio] = useState<Envio[]>([]);
  const [filteredEventosRecepcion, setFilteredEventosRecepcion] = useState<Envio[]>([]);
  
  // Búsqueda y filtros
  const [searchTermEnvio, setSearchTermEnvio] = useState("");
  const [searchTermRecepcion, setSearchTermRecepcion] = useState("");
  const [selectedCarrierEnvio, setSelectedCarrierEnvio] = useState<string>("all");
  const [selectedCarrierRecepcion, setSelectedCarrierRecepcion] = useState<string>("all");
  const [selectedProductEnvio, setSelectedProductEnvio] = useState<string>("all");
  const [selectedProductRecepcion, setSelectedProductRecepcion] = useState<string>("all");
  
  // Selección
  const [selectedEnvios, setSelectedEnvios] = useState<Set<number>>(new Set());
  const [selectedRecepciones, setSelectedRecepciones] = useState<Set<number>>(new Set());
  
  // Formulario
  const [fechaEnvio, setFechaEnvio] = useState("");
  const [fechaRecepcion, setFechaRecepcion] = useState("");
  const [notasEnvio, setNotasEnvio] = useState("");
  const [notasRecepcion, setNotasRecepcion] = useState("");
  
  // Catálogos
  const [carriers, setCarriers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);

  // Cargar eventos y catálogos al montar
  useEffect(() => {
    loadEventosEnvio();
    loadEventosRecepcion();
    loadCarriers();
    loadProducts();
  }, [clienteId]);

  // Aplicar filtros a eventos de envío
  useEffect(() => {
    let filtered = eventosEnvio;

    if (searchTermEnvio) {
      const search = searchTermEnvio.toLowerCase();
      filtered = filtered.filter(e =>
        e.id.toString().includes(search) ||
        e.nodo_origen.toLowerCase().includes(search) ||
        e.nodo_destino.toLowerCase().includes(search) ||
        e.panelista_origen?.nombre_completo.toLowerCase().includes(search) ||
        e.numero_etiqueta?.toLowerCase().includes(search)
      );
    }

    if (selectedCarrierEnvio !== "all") {
      filtered = filtered.filter(e => e.carrier_id?.toString() === selectedCarrierEnvio);
    }

    if (selectedProductEnvio !== "all") {
      filtered = filtered.filter(e => e.producto_id?.toString() === selectedProductEnvio);
    }

    setFilteredEventosEnvio(filtered);
  }, [eventosEnvio, searchTermEnvio, selectedCarrierEnvio, selectedProductEnvio]);

  // Aplicar filtros a eventos de recepción
  useEffect(() => {
    let filtered = eventosRecepcion;

    if (searchTermRecepcion) {
      const search = searchTermRecepcion.toLowerCase();
      filtered = filtered.filter(e =>
        e.id.toString().includes(search) ||
        e.nodo_origen.toLowerCase().includes(search) ||
        e.nodo_destino.toLowerCase().includes(search) ||
        e.panelista_destino?.nombre_completo.toLowerCase().includes(search) ||
        e.numero_etiqueta?.toLowerCase().includes(search)
      );
    }

    if (selectedCarrierRecepcion !== "all") {
      filtered = filtered.filter(e => e.carrier_id?.toString() === selectedCarrierRecepcion);
    }

    if (selectedProductRecepcion !== "all") {
      filtered = filtered.filter(e => e.producto_id?.toString() === selectedProductRecepcion);
    }

    setFilteredEventosRecepcion(filtered);
  }, [eventosRecepcion, searchTermRecepcion, selectedCarrierRecepcion, selectedProductRecepcion]);

  const loadCarriers = async () => {
    if (!clienteId) return;

    const { data } = await supabase
      .from("carriers")
      .select("id, legal_name")
      .eq("cliente_id", clienteId)
      .eq("status", "active")
      .order("legal_name");

    if (data) {
      setCarriers(data);
    }
  };

  const loadProducts = async () => {
    if (!clienteId) return;

    const { data } = await supabase
      .from("productos_cliente")
      .select("id, nombre_producto, codigo_producto")
      .eq("cliente_id", clienteId)
      .eq("estado", "activo")
      .order("nombre_producto");

    if (data) {
      setProducts(data);
    }
  };

  const loadEventosEnvio = async () => {
    if (!clienteId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("envios")
      .select(`
        id,
        nodo_origen,
        nodo_destino,
        producto_id,
        fecha_programada,
        numero_etiqueta,
        carrier_id,
        panelista_origen_id,
        productos_cliente:producto_id (
          nombre_producto
        ),
        carriers:carrier_id (
          legal_name
        ),
        panelista_origen:panelistas!panelista_origen_id (
          nombre_completo
        )
      `)
      .eq("cliente_id", clienteId)
      .eq("estado", "NOTIFIED")
      .order("fecha_programada", { ascending: true });

    if (error) {
      console.error("Error loading eventos envio:", error);
      toast({
        title: "Error",
        description: "Error al cargar eventos para envío",
        variant: "destructive",
      });
    } else {
      setEventosEnvio(data || []);
    }
    setLoading(false);
  };

  const loadEventosRecepcion = async () => {
    if (!clienteId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("envios")
      .select(`
        id,
        nodo_origen,
        nodo_destino,
        producto_id,
        fecha_programada,
        numero_etiqueta,
        carrier_id,
        panelista_destino_id,
        fecha_envio_real,
        productos_cliente:producto_id (
          nombre_producto
        ),
        carriers:carrier_id (
          legal_name
        ),
        panelista_destino:panelistas!panelista_destino_id (
          nombre_completo
        )
      `)
      .eq("cliente_id", clienteId)
      .eq("estado", "SENT")
      .order("fecha_programada", { ascending: true });

    if (error) {
      console.error("Error loading eventos recepcion:", error);
      toast({
        title: "Error",
        description: "Error al cargar eventos para recepción",
        variant: "destructive",
      });
    } else {
      setEventosRecepcion(data || []);
    }
    setLoading(false);
  };

  const handleToggleEnvio = (id: number) => {
    const newSelected = new Set(selectedEnvios);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEnvios(newSelected);
  };

  const handleToggleRecepcion = (id: number) => {
    const newSelected = new Set(selectedRecepciones);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecepciones(newSelected);
  };

  const handleSelectAllEnvios = () => {
    if (selectedEnvios.size === filteredEventosEnvio.length) {
      setSelectedEnvios(new Set());
    } else {
      setSelectedEnvios(new Set(filteredEventosEnvio.map(e => e.id)));
    }
  };

  const handleSelectAllRecepciones = () => {
    if (selectedRecepciones.size === filteredEventosRecepcion.length) {
      setSelectedRecepciones(new Set());
    } else {
      setSelectedRecepciones(new Set(filteredEventosRecepcion.map(e => e.id)));
    }
  };

  const clearFiltersEnvio = () => {
    setSearchTermEnvio("");
    setSelectedCarrierEnvio("all");
    setSelectedProductEnvio("all");
  };

  const clearFiltersRecepcion = () => {
    setSearchTermRecepcion("");
    setSelectedCarrierRecepcion("all");
    setSelectedProductRecepcion("all");
  };

  const handleRegistrarEnvio = async () => {
    if (selectedEnvios.size === 0) {
      toast({
        title: "Error",
        description: "Seleccione al menos un evento",
        variant: "destructive",
      });
      return;
    }

    if (!fechaEnvio) {
      toast({
        title: "Error",
        description: "Ingrese la fecha/hora de envío",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const eventosIds = Array.from(selectedEnvios);

      // Get eventos to verify numero_etiqueta
      const { data: eventosData } = await supabase
        .from("envios")
        .select("id, numero_etiqueta")
        .in("id", eventosIds);

      // Check for missing tracking numbers
      const missingEtiqueta = eventosData?.filter(e => !e.numero_etiqueta);
      if (missingEtiqueta && missingEtiqueta.length > 0) {
        toast({
          title: "Advertencia",
          description: `${missingEtiqueta.length} evento(s) no tienen número de etiqueta. Esto puede causar problemas de validación.`,
          variant: "default",
        });
      }

      const { error } = await supabase
        .from("envios")
        .update({
          estado: "SENT",
          fecha_envio_real: new Date(fechaEnvio).toISOString(),
          observaciones: notasEnvio || null,
        })
        .in("id", eventosIds);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `${selectedEnvios.size} evento(s) registrado(s) como enviado(s)`,
      });

      // Reset
      setSelectedEnvios(new Set());
      setFechaEnvio("");
      setNotasEnvio("");
      loadEventosEnvio();
    } catch (error) {
      console.error("Error registrando envío:", error);
      toast({
        title: "Error",
        description: "Error al registrar el envío",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarRecepcion = async () => {
    if (selectedRecepciones.size === 0) {
      toast({
        title: "Error",
        description: "Seleccione al menos un evento",
        variant: "destructive",
      });
      return;
    }

    if (!fechaRecepcion) {
      toast({
        title: "Error",
        description: "Ingrese la fecha/hora de recepción",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const eventosIds = Array.from(selectedRecepciones);

      // Get eventos to calculate transit time and verify data
      const { data: eventosData } = await supabase
        .from("envios")
        .select("id, fecha_envio_real, numero_etiqueta")
        .in("id", eventosIds);

      if (!eventosData) throw new Error("No se pudieron cargar los eventos");

      const fechaRecepcionDate = new Date(fechaRecepcion);

      // Check for missing tracking numbers
      const missingEtiqueta = eventosData.filter(e => !e.numero_etiqueta);
      if (missingEtiqueta.length > 0) {
        toast({
          title: "Advertencia",
          description: `${missingEtiqueta.length} evento(s) no tienen número de etiqueta. Esto causará problemas de validación.`,
          variant: "default",
        });
      }

      // Update each event with calculated transit time
      for (const evento of eventosData) {
        const fechaEnvioDate = new Date(evento.fecha_envio_real);
        
        // Validate date order
        if (fechaRecepcionDate <= fechaEnvioDate) {
          toast({
            title: "Error",
            description: `Evento #${evento.id}: La fecha de recepción debe ser posterior a la fecha de envío`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const diffTime = Math.abs(fechaRecepcionDate.getTime() - fechaEnvioDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        await supabase
          .from("envios")
          .update({
            estado: "RECEIVED",
            fecha_recepcion_real: fechaRecepcionDate.toISOString(),
            tiempo_transito_dias: diffDays,
            observaciones: notasRecepcion || null,
          })
          .eq("id", evento.id);
      }

      // Automatic validation after registration
      const { data: validationResult, error: validationError } = await supabase.functions.invoke(
        'validate-received-events',
        {
          body: { envioIds: eventosIds }
        }
      );

      if (validationError) {
        console.error('Error en validación automática:', validationError);
        toast({
          title: "Advertencia",
          description: "Eventos registrados pero la validación automática falló. Por favor ejecute 'Re-run Validation' manualmente.",
          variant: "default",
        });
      } else if (validationResult) {
        const { validated, pending } = validationResult;
        
        let message = `${selectedRecepciones.size} evento(s) registrado(s)`;
        const details = [];
        if (validated > 0) details.push(`✅ ${validated} validado(s)`);
        if (pending > 0) details.push(`⚠️ ${pending} requieren revisión`);
        if (details.length > 0) message += `: ${details.join(', ')}`;
        
        toast({
          title: "Éxito",
          description: message,
        });
      }

      // Reset
      setSelectedRecepciones(new Set());
      setFechaRecepcion("");
      setNotasRecepcion("");
      loadEventosRecepcion();
    } catch (error) {
      console.error("Error registrando recepción:", error);
      toast({
        title: "Error",
        description: "Error al registrar la recepción",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFiltersEnvio = searchTermEnvio || selectedCarrierEnvio !== "all" || selectedProductEnvio !== "all";
  const hasActiveFiltersRecepcion = searchTermRecepcion || selectedCarrierRecepcion !== "all" || selectedProductRecepcion !== "all";

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Registrar Envío/Recepción</h1>
          <p className="text-muted-foreground mt-2">
            Registre los eventos enviados o recibidos por los panelistas
          </p>
        </div>

        <Tabs defaultValue="envio" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="envio">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Registrar Envío
            </TabsTrigger>
            <TabsTrigger value="recepcion">
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              Registrar Recepción
            </TabsTrigger>
          </TabsList>

          {/* TAB ENVÍO */}
          <TabsContent value="envio">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Eventos Enviados (NOTIFIED → SENT)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Filtros de Búsqueda */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Buscar por ID, nodo, panelista, etiqueta..."
                        value={searchTermEnvio}
                        onChange={(e) => setSearchTermEnvio(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {hasActiveFiltersEnvio && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearFiltersEnvio}
                        title="Limpiar filtros"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-sm mb-1.5 block">Carrier</Label>
                      <Select value={selectedCarrierEnvio} onValueChange={setSelectedCarrierEnvio}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los carriers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los carriers</SelectItem>
                          {carriers.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.legal_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <Label className="text-sm mb-1.5 block">Producto</Label>
                      <Select value={selectedProductEnvio} onValueChange={setSelectedProductEnvio}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los productos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los productos</SelectItem>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.codigo_producto} - {p.nombre_producto}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Eventos Disponibles */}
                <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Eventos Pendientes de Envío ({filteredEventosEnvio.length})</Label>
                        {filteredEventosEnvio.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAllEnvios}
                          >
                            <CheckSquare className="w-4 h-4 mr-2" />
                            {selectedEnvios.size === filteredEventosEnvio.length ? "Deseleccionar" : "Seleccionar"} Todos
                          </Button>
                        )}
                      </div>
                      
                      {loading ? (
                        <p className="text-sm text-muted-foreground">Cargando eventos...</p>
                      ) : filteredEventosEnvio.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {eventosEnvio.length === 0 
                            ? "No hay eventos pendientes de envío" 
                            : "No se encontraron eventos con los filtros aplicados"}
                        </p>
                      ) : (
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Panelista Origen</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead>Destino</TableHead>
                                <TableHead>Fecha Programada</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead>Carrier</TableHead>
                                <TableHead>Etiqueta</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredEventosEnvio.map((evento) => (
                                <TableRow key={evento.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedEnvios.has(evento.id)}
                                      onCheckedChange={() => handleToggleEnvio(evento.id)}
                                    />
                                  </TableCell>
                                  <TableCell>{evento.id}</TableCell>
                                  <TableCell>{evento.panelista_origen?.nombre_completo || "-"}</TableCell>
                                  <TableCell>{evento.nodo_origen}</TableCell>
                                  <TableCell>{evento.nodo_destino}</TableCell>
                                  <TableCell>{format(new Date(evento.fecha_programada), "dd/MM/yyyy")}</TableCell>
                                  <TableCell>{evento.productos_cliente?.nombre_producto || "-"}</TableCell>
                                  <TableCell>{evento.carriers?.legal_name || "-"}</TableCell>
                                  <TableCell>{evento.numero_etiqueta || "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    {/* Formulario de Registro */}
                    {selectedEnvios.size > 0 && (
                      <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold">Datos del Envío ({selectedEnvios.size} evento(s) seleccionado(s))</h3>
                        
                        <div className="space-y-2">
                          <Label htmlFor="fecha-envio">Fecha y Hora de Envío Real *</Label>
                          <Input
                            id="fecha-envio"
                            type="datetime-local"
                            value={fechaEnvio}
                            onChange={(e) => setFechaEnvio(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="notas-envio">Notas/Observaciones (opcional)</Label>
                          <Input
                            id="notas-envio"
                            placeholder="Agregar notas adicionales..."
                            value={notasEnvio}
                            onChange={(e) => setNotasEnvio(e.target.value)}
                          />
                        </div>

                        <Button
                          onClick={handleRegistrarEnvio}
                          disabled={loading}
                          className="w-full"
                        >
                          <ArrowUpRight className="w-4 h-4 mr-2" />
                          Registrar Envío(s)
                        </Button>
                      </div>
                    )}
                  </>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB RECEPCIÓN */}
          <TabsContent value="recepcion">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Eventos Recibidos (SENT → RECEIVED)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Filtros de Búsqueda */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Buscar por ID, nodo, panelista, etiqueta..."
                        value={searchTermRecepcion}
                        onChange={(e) => setSearchTermRecepcion(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {hasActiveFiltersRecepcion && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearFiltersRecepcion}
                        title="Limpiar filtros"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-sm mb-1.5 block">Carrier</Label>
                      <Select value={selectedCarrierRecepcion} onValueChange={setSelectedCarrierRecepcion}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los carriers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los carriers</SelectItem>
                          {carriers.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.legal_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <Label className="text-sm mb-1.5 block">Producto</Label>
                      <Select value={selectedProductRecepcion} onValueChange={setSelectedProductRecepcion}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los productos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los productos</SelectItem>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.codigo_producto} - {p.nombre_producto}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Eventos Disponibles */}
                <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Eventos Pendientes de Recepción ({filteredEventosRecepcion.length})</Label>
                        {filteredEventosRecepcion.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAllRecepciones}
                          >
                            <CheckSquare className="w-4 h-4 mr-2" />
                            {selectedRecepciones.size === filteredEventosRecepcion.length ? "Deseleccionar" : "Seleccionar"} Todos
                          </Button>
                        )}
                      </div>
                      
                      {loading ? (
                        <p className="text-sm text-muted-foreground">Cargando eventos...</p>
                      ) : filteredEventosRecepcion.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {eventosRecepcion.length === 0 
                            ? "No hay eventos pendientes de recepción" 
                            : "No se encontraron eventos con los filtros aplicados"}
                        </p>
                      ) : (
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Panelista Destino</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead>Destino</TableHead>
                                <TableHead>Fecha Programada</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead>Carrier</TableHead>
                                <TableHead>Etiqueta</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredEventosRecepcion.map((evento) => (
                                <TableRow key={evento.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedRecepciones.has(evento.id)}
                                      onCheckedChange={() => handleToggleRecepcion(evento.id)}
                                    />
                                  </TableCell>
                                  <TableCell>{evento.id}</TableCell>
                                  <TableCell>{evento.panelista_destino?.nombre_completo || "-"}</TableCell>
                                  <TableCell>{evento.nodo_origen}</TableCell>
                                  <TableCell>{evento.nodo_destino}</TableCell>
                                  <TableCell>{format(new Date(evento.fecha_programada), "dd/MM/yyyy")}</TableCell>
                                  <TableCell>{evento.productos_cliente?.nombre_producto || "-"}</TableCell>
                                  <TableCell>{evento.carriers?.legal_name || "-"}</TableCell>
                                  <TableCell>{evento.numero_etiqueta || "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    {/* Formulario de Registro */}
                    {selectedRecepciones.size > 0 && (
                      <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold">Datos de la Recepción ({selectedRecepciones.size} evento(s) seleccionado(s))</h3>
                        
                        <div className="space-y-2">
                          <Label htmlFor="fecha-recepcion">Fecha y Hora de Recepción Real *</Label>
                          <Input
                            id="fecha-recepcion"
                            type="datetime-local"
                            value={fechaRecepcion}
                            onChange={(e) => setFechaRecepcion(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="notas-recepcion">Notas/Observaciones (opcional)</Label>
                          <Input
                            id="notas-recepcion"
                            placeholder="Agregar notas adicionales..."
                            value={notasRecepcion}
                            onChange={(e) => setNotasRecepcion(e.target.value)}
                          />
                        </div>

                        <Button
                          onClick={handleRegistrarRecepcion}
                          disabled={loading}
                          className="w-full"
                        >
                          <ArrowDownLeft className="w-4 h-4 mr-2" />
                          Registrar Recepción(es)
                        </Button>
                      </div>
                    )}
                  </>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
