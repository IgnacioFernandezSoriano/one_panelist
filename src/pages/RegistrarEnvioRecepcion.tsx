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
import { CheckSquare, Package, Send } from "lucide-react";
import { format } from "date-fns";

interface Panelista {
  id: number;
  nombre_completo: string;
  nodo_asignado: string;
}

interface Envio {
  id: number;
  nodo_origen: string;
  nodo_destino: string;
  producto_id: number;
  fecha_programada: string;
  numero_etiqueta: string | null;
  carrier_id: number | null;
  productos_cliente?: {
    nombre_producto: string;
  };
  carriers?: {
    legal_name: string;
  };
}

export default function RegistrarEnvioRecepcion() {
  const { clienteId } = useUserRole();
  const { toast } = useToast();
  
  // Panelistas
  const [panelistas, setPanelistas] = useState<Panelista[]>([]);
  const [selectedPanelistaEnvio, setSelectedPanelistaEnvio] = useState<string>("");
  const [selectedPanelistaRecepcion, setSelectedPanelistaRecepcion] = useState<string>("");
  
  // Eventos disponibles
  const [eventosEnvio, setEventosEnvio] = useState<Envio[]>([]);
  const [eventosRecepcion, setEventosRecepcion] = useState<Envio[]>([]);
  
  // Selección
  const [selectedEnvios, setSelectedEnvios] = useState<Set<number>>(new Set());
  const [selectedRecepciones, setSelectedRecepciones] = useState<Set<number>>(new Set());
  
  // Formulario
  const [fechaEnvio, setFechaEnvio] = useState("");
  const [fechaRecepcion, setFechaRecepcion] = useState("");
  const [notasEnvio, setNotasEnvio] = useState("");
  const [notasRecepcion, setNotasRecepcion] = useState("");
  
  const [loading, setLoading] = useState(false);

  // Cargar panelistas
  useEffect(() => {
    loadPanelistas();
  }, [clienteId]);

  // Cargar eventos cuando cambia el panelista
  useEffect(() => {
    if (selectedPanelistaEnvio) {
      loadEventosEnvio(parseInt(selectedPanelistaEnvio));
    } else {
      setEventosEnvio([]);
    }
    setSelectedEnvios(new Set());
  }, [selectedPanelistaEnvio]);

  useEffect(() => {
    if (selectedPanelistaRecepcion) {
      loadEventosRecepcion(parseInt(selectedPanelistaRecepcion));
    } else {
      setEventosRecepcion([]);
    }
    setSelectedRecepciones(new Set());
  }, [selectedPanelistaRecepcion]);

  const loadPanelistas = async () => {
    if (!clienteId) return;

    const { data, error } = await supabase
      .from("panelistas")
      .select("id, nombre_completo, nodo_asignado")
      .eq("cliente_id", clienteId)
      .eq("estado", "activo")
      .order("nombre_completo");

    if (error) {
      console.error("Error loading panelistas:", error);
      return;
    }

    setPanelistas(data || []);
  };

  const loadEventosEnvio = async (panelistaId: number) => {
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
        productos_cliente:producto_id (
          nombre_producto
        ),
        carriers:carrier_id (
          legal_name
        )
      `)
      .eq("cliente_id", clienteId)
      .eq("estado", "NOTIFIED")
      .eq("panelista_origen_id", panelistaId)
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

  const loadEventosRecepcion = async (panelistaId: number) => {
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
        fecha_envio_real,
        productos_cliente:producto_id (
          nombre_producto
        ),
        carriers:carrier_id (
          legal_name
        )
      `)
      .eq("cliente_id", clienteId)
      .eq("estado", "SENT")
      .eq("panelista_destino_id", panelistaId)
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
      loadEventosEnvio(parseInt(selectedPanelistaEnvio));
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

      // Get eventos to calculate transit time
      const { data: eventosData } = await supabase
        .from("envios")
        .select("id, fecha_envio_real")
        .in("id", eventosIds);

      if (!eventosData) throw new Error("No se pudieron cargar los eventos");

      const fechaRecepcionDate = new Date(fechaRecepcion);

      // Update each event with calculated transit time
      for (const evento of eventosData) {
        const fechaEnvioDate = new Date(evento.fecha_envio_real);
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

      toast({
        title: "Éxito",
        description: `${selectedRecepciones.size} evento(s) registrado(s) como recibido(s)`,
      });

      // Reset
      setSelectedRecepciones(new Set());
      setFechaRecepcion("");
      setNotasRecepcion("");
      loadEventosRecepcion(parseInt(selectedPanelistaRecepcion));
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

  const handleSelectAllEnvios = () => {
    if (selectedEnvios.size === eventosEnvio.length) {
      setSelectedEnvios(new Set());
    } else {
      setSelectedEnvios(new Set(eventosEnvio.map(e => e.id)));
    }
  };

  const handleSelectAllRecepciones = () => {
    if (selectedRecepciones.size === eventosRecepcion.length) {
      setSelectedRecepciones(new Set());
    } else {
      setSelectedRecepciones(new Set(eventosRecepcion.map(e => e.id)));
    }
  };

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
              <Send className="w-4 h-4 mr-2" />
              Registrar Envío
            </TabsTrigger>
            <TabsTrigger value="recepcion">
              <Package className="w-4 h-4 mr-2" />
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
                {/* Selector de Panelista */}
                <div className="space-y-2">
                  <Label>Panelista (Origen)</Label>
                  <Select
                    value={selectedPanelistaEnvio}
                    onValueChange={setSelectedPanelistaEnvio}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un panelista" />
                    </SelectTrigger>
                    <SelectContent>
                      {panelistas.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.nombre_completo} - {p.nodo_asignado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Eventos Disponibles */}
                {selectedPanelistaEnvio && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Eventos Pendientes de Envío ({eventosEnvio.length})</Label>
                        {eventosEnvio.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAllEnvios}
                          >
                            <CheckSquare className="w-4 h-4 mr-2" />
                            {selectedEnvios.size === eventosEnvio.length ? "Deseleccionar" : "Seleccionar"} Todos
                          </Button>
                        )}
                      </div>
                      
                      {loading ? (
                        <p className="text-sm text-muted-foreground">Cargando eventos...</p>
                      ) : eventosEnvio.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay eventos pendientes de envío para este panelista</p>
                      ) : (
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Fecha Programada</TableHead>
                                <TableHead>Destino</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead>Carrier</TableHead>
                                <TableHead>Etiqueta</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {eventosEnvio.map((evento) => (
                                <TableRow key={evento.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedEnvios.has(evento.id)}
                                      onCheckedChange={() => handleToggleEnvio(evento.id)}
                                    />
                                  </TableCell>
                                  <TableCell>{evento.id}</TableCell>
                                  <TableCell>{format(new Date(evento.fecha_programada), "dd/MM/yyyy")}</TableCell>
                                  <TableCell>{evento.nodo_destino}</TableCell>
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
                          <Send className="w-4 h-4 mr-2" />
                          Registrar Envío(s)
                        </Button>
                      </div>
                    )}
                  </>
                )}
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
                {/* Selector de Panelista */}
                <div className="space-y-2">
                  <Label>Panelista (Destino)</Label>
                  <Select
                    value={selectedPanelistaRecepcion}
                    onValueChange={setSelectedPanelistaRecepcion}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un panelista" />
                    </SelectTrigger>
                    <SelectContent>
                      {panelistas.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.nombre_completo} - {p.nodo_asignado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Eventos Disponibles */}
                {selectedPanelistaRecepcion && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Eventos Pendientes de Recepción ({eventosRecepcion.length})</Label>
                        {eventosRecepcion.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAllRecepciones}
                          >
                            <CheckSquare className="w-4 h-4 mr-2" />
                            {selectedRecepciones.size === eventosRecepcion.length ? "Deseleccionar" : "Seleccionar"} Todos
                          </Button>
                        )}
                      </div>
                      
                      {loading ? (
                        <p className="text-sm text-muted-foreground">Cargando eventos...</p>
                      ) : eventosRecepcion.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay eventos pendientes de recepción para este panelista</p>
                      ) : (
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Fecha Programada</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead>Carrier</TableHead>
                                <TableHead>Etiqueta</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {eventosRecepcion.map((evento) => (
                                <TableRow key={evento.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedRecepciones.has(evento.id)}
                                      onCheckedChange={() => handleToggleRecepcion(evento.id)}
                                    />
                                  </TableCell>
                                  <TableCell>{evento.id}</TableCell>
                                  <TableCell>{format(new Date(evento.fecha_programada), "dd/MM/yyyy")}</TableCell>
                                  <TableCell>{evento.nodo_origen}</TableCell>
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
                          <Package className="w-4 h-4 mr-2" />
                          Registrar Recepción(es)
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
