import React, { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowUpRight, ArrowDownLeft, Package } from "lucide-react";
import { format } from "date-fns";

interface Evento {
  id: number;
  nodo_origen: string;
  nodo_destino: string;
  fecha_programada: string;
  numero_etiqueta: string | null;
  status: string;
  producto_id: number;
  carrier_id: number;
}

export default function RegistrarEnvioRecepcion() {
  const { clienteId } = useUserRole();
  const { toast } = useToast();
  
  // Estados para eventos
  const [eventosNotified, setEventosNotified] = useState<Evento[]>([]);
  const [eventosSent, setEventosSent] = useState<Evento[]>([]);
  
  // Estados para selección
  const [selectedNotified, setSelectedNotified] = useState<Set<number>>(new Set());
  const [selectedSent, setSelectedSent] = useState<Set<number>>(new Set());
  
  // Estados para formularios
  const [fechaEnvio, setFechaEnvio] = useState("");
  const [fechaRecepcion, setFechaRecepcion] = useState("");
  
  // Estados para etiquetas individuales
  const [etiquetas, setEtiquetas] = useState<Map<number, string>>(new Map());
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("RegistrarEnvioRecepcion - clienteId:", clienteId);
    if (clienteId) {
      console.log("Loading eventos...");
      loadEventosNotified();
      loadEventosSent();
    } else {
      console.log("No clienteId, skipping load");
    }
  }, [clienteId]);

  const loadEventosNotified = async () => {
    if (!clienteId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("generated_allocation_plan_details")
      .select(`
        id,
        nodo_origen,
        nodo_destino,
        fecha_programada,
        numero_etiqueta,
        status,
        producto_id,
        carrier_id
      `)
      .eq("cliente_id", clienteId)
      .eq("status", "NOTIFIED")
      .order("fecha_programada", { ascending: true });

    if (error) {
      console.error("Error loading eventos notified:", error);
      toast({
        title: "Error",
        description: "Error al cargar eventos notificados",
        variant: "destructive",
      });
    } else {
      setEventosNotified(data || []);
      // Inicializar etiquetas con valores existentes
      const etiquetasMap = new Map();
      data?.forEach(e => {
        if (e.numero_etiqueta) {
          etiquetasMap.set(e.id, e.numero_etiqueta);
        }
      });
      setEtiquetas(etiquetasMap);
    }
    setLoading(false);
  };

  const loadEventosSent = async () => {
    if (!clienteId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("generated_allocation_plan_details")
      .select(`
        id,
        nodo_origen,
        nodo_destino,
        fecha_programada,
        numero_etiqueta,
        status,
        producto_id,
        carrier_id
      `)
      .eq("cliente_id", clienteId)
      .eq("status", "SENT")
      .order("fecha_programada", { ascending: true });

    if (error) {
      console.error("Error loading eventos sent:", error);
      toast({
        title: "Error",
        description: "Error al cargar eventos enviados",
        variant: "destructive",
      });
    } else {
      setEventosSent(data || []);
    }
    setLoading(false);
  };

  const handleToggleNotified = (id: number) => {
    const newSet = new Set(selectedNotified);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedNotified(newSet);
  };

  const handleToggleSent = (id: number) => {
    const newSet = new Set(selectedSent);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedSent(newSet);
  };

  const handleSelectAllNotified = () => {
    if (selectedNotified.size === eventosNotified.length) {
      setSelectedNotified(new Set());
    } else {
      setSelectedNotified(new Set(eventosNotified.map(e => e.id)));
    }
  };

  const handleSelectAllSent = () => {
    if (selectedSent.size === eventosSent.length) {
      setSelectedSent(new Set());
    } else {
      setSelectedSent(new Set(eventosSent.map(e => e.id)));
    }
  };

  const handleEtiquetaChange = (eventoId: number, value: string) => {
    const newEtiquetas = new Map(etiquetas);
    newEtiquetas.set(eventoId, value);
    setEtiquetas(newEtiquetas);
  };

  const handleRegistrarEnvio = async () => {
    if (selectedNotified.size === 0) {
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
        description: "Ingrese la fecha y hora de envío",
        variant: "destructive",
      });
      return;
    }

    // Validar que todos los eventos seleccionados tengan etiqueta
    const eventosSeleccionados = Array.from(selectedNotified);
    const sinEtiqueta = eventosSeleccionados.filter(id => !etiquetas.get(id));
    
    if (sinEtiqueta.length > 0) {
      toast({
        title: "Error",
        description: `${sinEtiqueta.length} evento(s) no tienen número de etiqueta asignado`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Actualizar cada evento individualmente con su etiqueta
      for (const eventoId of eventosSeleccionados) {
        const { error } = await supabase
          .from("generated_allocation_plan_details")
          .update({
            status: "SENT",
            fecha_envio_real: new Date(fechaEnvio).toISOString(),
            numero_etiqueta: etiquetas.get(eventoId),
          })
          .eq("id", eventoId);

        if (error) throw error;
      }

      toast({
        title: "Éxito",
        description: `${selectedNotified.size} evento(s) registrado(s) como enviado(s)`,
      });

      // Reset y recargar
      setSelectedNotified(new Set());
      setFechaEnvio("");
      loadEventosNotified();
      loadEventosSent();
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
    if (selectedSent.size === 0) {
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
        description: "Ingrese la fecha y hora de recepción",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const eventosIds = Array.from(selectedSent);

      const { error } = await supabase
        .from("generated_allocation_plan_details")
        .update({
          status: "RECEIVED",
          fecha_recepcion_real: new Date(fechaRecepcion).toISOString(),
        })
        .in("id", eventosIds);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `${selectedSent.size} evento(s) registrado(s) como recibido(s)`,
      });

      // Reset y recargar
      setSelectedSent(new Set());
      setFechaRecepcion("");
      loadEventosSent();
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

  return (
    <AppLayout title="Registrar Envío/Recepción">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Registrar Envío/Recepción</h1>
          <p className="text-muted-foreground mt-2">
            Registre los eventos enviados o recibidos por los panelistas
          </p>
        </div>

        <Tabs defaultValue="envio" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="envio">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Registrar Envío
            </TabsTrigger>
            <TabsTrigger value="recepcion">
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              Registrar Recepción
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: REGISTRAR ENVÍO (NOTIFIED → SENT) */}
          <TabsContent value="envio">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Eventos Enviados (NOTIFIED → SENT)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">
                      Eventos Pendientes de Envío ({eventosNotified.length})
                    </Label>
                    {eventosNotified.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllNotified}
                      >
                        {selectedNotified.size === eventosNotified.length
                          ? "Deseleccionar Todos"
                          : "Seleccionar Todos"}
                      </Button>
                    )}
                  </div>

                  {loading ? (
                    <p className="text-sm text-muted-foreground">Cargando eventos...</p>
                  ) : eventosNotified.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No hay eventos pendientes de envío</p>
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Origen</TableHead>
                            <TableHead>Destino</TableHead>
                            <TableHead>Fecha Programada</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Carrier</TableHead>
                            <TableHead>Número de Etiqueta</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eventosNotified.map((evento) => (
                            <TableRow key={evento.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedNotified.has(evento.id)}
                                  onCheckedChange={() => handleToggleNotified(evento.id)}
                                />
                              </TableCell>
                              <TableCell>{evento.id}</TableCell>
                              <TableCell>{evento.nodo_origen}</TableCell>
                              <TableCell>{evento.nodo_destino}</TableCell>
                              <TableCell>
                                {format(new Date(evento.fecha_programada), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>{evento.producto_id}</TableCell>
                              <TableCell>{evento.carrier_id}</TableCell>
                              <TableCell>
                                <Input
                                  placeholder="Etiqueta"
                                  value={etiquetas.get(evento.id) || ""}
                                  onChange={(e) => handleEtiquetaChange(evento.id, e.target.value)}
                                  className="w-40"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Formulario de Registro de Envío */}
                {selectedNotified.size > 0 && (
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="font-semibold text-lg">
                      Datos del Envío ({selectedNotified.size} evento(s) seleccionado(s))
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="fecha-envio">Fecha y Hora de Envío Real *</Label>
                      <Input
                        id="fecha-envio"
                        type="datetime-local"
                        value={fechaEnvio}
                        onChange={(e) => setFechaEnvio(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={handleRegistrarEnvio}
                      disabled={loading}
                      className="w-full"
                      size="lg"
                    >
                      <ArrowUpRight className="w-4 h-4 mr-2" />
                      Registrar Envío(s)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: REGISTRAR RECEPCIÓN (SENT → RECEIVED) */}
          <TabsContent value="recepcion">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Eventos Recibidos (SENT → RECEIVED)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">
                      Eventos Pendientes de Recepción ({eventosSent.length})
                    </Label>
                    {eventosSent.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllSent}
                      >
                        {selectedSent.size === eventosSent.length
                          ? "Deseleccionar Todos"
                          : "Seleccionar Todos"}
                      </Button>
                    )}
                  </div>

                  {loading ? (
                    <p className="text-sm text-muted-foreground">Cargando eventos...</p>
                  ) : eventosSent.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No hay eventos pendientes de recepción</p>
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Origen</TableHead>
                            <TableHead>Destino</TableHead>
                            <TableHead>Fecha Programada</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Carrier</TableHead>
                            <TableHead>Etiqueta</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eventosSent.map((evento) => (
                            <TableRow key={evento.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedSent.has(evento.id)}
                                  onCheckedChange={() => handleToggleSent(evento.id)}
                                />
                              </TableCell>
                              <TableCell>{evento.id}</TableCell>
                              <TableCell>{evento.nodo_origen}</TableCell>
                              <TableCell>{evento.nodo_destino}</TableCell>
                              <TableCell>
                                {format(new Date(evento.fecha_programada), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>{evento.producto_id}</TableCell>
                              <TableCell>{evento.carrier_id}</TableCell>
                              <TableCell>{evento.numero_etiqueta || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Formulario de Registro de Recepción */}
                {selectedSent.size > 0 && (
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="font-semibold text-lg">
                      Datos de la Recepción ({selectedSent.size} evento(s) seleccionado(s))
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="fecha-recepcion">Fecha y Hora de Recepción Real *</Label>
                      <Input
                        id="fecha-recepcion"
                        type="datetime-local"
                        value={fechaRecepcion}
                        onChange={(e) => setFechaRecepcion(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={handleRegistrarRecepcion}
                      disabled={loading}
                      className="w-full"
                      size="lg"
                    >
                      <ArrowDownLeft className="w-4 h-4 mr-2" />
                      Registrar Recepción(es)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
