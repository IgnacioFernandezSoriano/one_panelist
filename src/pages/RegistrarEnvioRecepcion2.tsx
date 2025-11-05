import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCliente } from "@/contexts/ClienteContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpRight, ArrowDownLeft, Package, Check } from "lucide-react";
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
  fecha_envio_real?: string | null;
  fecha_recepcion_real?: string | null;
}

interface EventoFormData {
  numero_etiqueta: string;
  fecha_envio: string;
  fecha_recepcion: string;
}

export default function RegistrarEnvioRecepcion() {
  const { clienteId } = useCliente();
  const { toast } = useToast();
  
  const [eventosNotified, setEventosNotified] = useState<Evento[]>([]);
  const [eventosSent, setEventosSent] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estado para datos de formulario por evento
  const [formData, setFormData] = useState<Map<number, EventoFormData>>(new Map());

  useEffect(() => {
    if (clienteId) {
      loadEventosNotified();
      loadEventosSent();
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
      
      // Inicializar formData con valores por defecto
      const newFormData = new Map<number, EventoFormData>();
      data?.forEach(e => {
        newFormData.set(e.id, {
          numero_etiqueta: e.numero_etiqueta || "",
          fecha_envio: new Date().toISOString().slice(0, 16),
          fecha_recepcion: ""
        });
      });
      setFormData(newFormData);
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
        carrier_id,
        fecha_envio_real
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
      
      // Inicializar formData para eventos SENT
      const newFormData = new Map(formData);
      data?.forEach(e => {
        if (!newFormData.has(e.id)) {
          newFormData.set(e.id, {
            numero_etiqueta: e.numero_etiqueta || "",
            fecha_envio: e.fecha_envio_real || "",
            fecha_recepcion: new Date().toISOString().slice(0, 16)
          });
        }
      });
      setFormData(newFormData);
    }
    setLoading(false);
  };

  const updateFormData = (eventoId: number, field: keyof EventoFormData, value: string) => {
    const newFormData = new Map(formData);
    const current = newFormData.get(eventoId) || {
      numero_etiqueta: "",
      fecha_envio: new Date().toISOString().slice(0, 16),
      fecha_recepcion: new Date().toISOString().slice(0, 16)
    };
    newFormData.set(eventoId, { ...current, [field]: value });
    setFormData(newFormData);
  };

  const handleRegistrarEnvio = async (eventoId: number) => {
    const data = formData.get(eventoId);
    
    if (!data?.numero_etiqueta) {
      toast({
        title: "Error",
        description: "Ingrese el número de etiqueta",
        variant: "destructive",
      });
      return;
    }

    if (!data?.fecha_envio) {
      toast({
        title: "Error",
        description: "Ingrese la fecha y hora de envío",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("generated_allocation_plan_details")
      .update({
        numero_etiqueta: data.numero_etiqueta,
        fecha_envio_real: data.fecha_envio,
        status: "SENT"
      })
      .eq("id", eventoId);

    if (error) {
      console.error("Error registrando envío:", error);
      toast({
        title: "Error",
        description: "Error al registrar el envío",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Envío registrado correctamente",
      });
      
      // Recargar datos
      await loadEventosNotified();
      await loadEventosSent();
    }

    setLoading(false);
  };

  const handleRegistrarRecepcion = async (eventoId: number) => {
    const data = formData.get(eventoId);
    
    if (!data?.fecha_recepcion) {
      toast({
        title: "Error",
        description: "Ingrese la fecha y hora de recepción",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("generated_allocation_plan_details")
      .update({
        fecha_recepcion_real: data.fecha_recepcion,
        status: "RECEIVED"
      })
      .eq("id", eventoId);

    if (error) {
      console.error("Error registrando recepción:", error);
      toast({
        title: "Error",
        description: "Error al registrar la recepción",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Recepción registrada correctamente",
      });
      
      // Recargar datos
      await loadEventosNotified();
      await loadEventosSent();
    }

    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Registrar Envío/Recepción</h1>
          <p className="text-muted-foreground">
            Registre los eventos enviados o recibidos por los panelistas
          </p>
        </div>

        <Tabs defaultValue="envio" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="envio" className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Registrar Envío
            </TabsTrigger>
            <TabsTrigger value="recepcion" className="flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4" />
              Registrar Recepción
            </TabsTrigger>
          </TabsList>

          {/* Tab: Registrar Envío (NOTIFIED → SENT) */}
          <TabsContent value="envio">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Registrar Eventos Enviados (NOTIFIED → SENT)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Eventos Pendientes de Envío ({eventosNotified.length})
                  </p>

                  {loading ? (
                    <div className="text-center py-8">Cargando...</div>
                  ) : eventosNotified.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      No hay eventos pendientes de envío
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Origen</TableHead>
                            <TableHead>Destino</TableHead>
                            <TableHead>Fecha Programada</TableHead>
                            <TableHead>Número de Etiqueta</TableHead>
                            <TableHead>Fecha/Hora Envío</TableHead>
                            <TableHead className="text-center">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eventosNotified.map((evento) => {
                            const data = formData.get(evento.id);
                            return (
                              <TableRow key={evento.id}>
                                <TableCell className="font-mono text-sm">{evento.id}</TableCell>
                                <TableCell className="font-mono text-xs">{evento.nodo_origen}</TableCell>
                                <TableCell className="font-mono text-xs">{evento.nodo_destino}</TableCell>
                                <TableCell>
                                  {format(new Date(evento.fecha_programada), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    placeholder="Ingrese etiqueta"
                                    value={data?.numero_etiqueta || ""}
                                    onChange={(e) => updateFormData(evento.id, "numero_etiqueta", e.target.value)}
                                    className="w-full"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="datetime-local"
                                    value={data?.fecha_envio || ""}
                                    onChange={(e) => updateFormData(evento.id, "fecha_envio", e.target.value)}
                                    className="w-full"
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    onClick={() => handleRegistrarEnvio(evento.id)}
                                    disabled={loading}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Registrar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Registrar Recepción (SENT → RECEIVED) */}
          <TabsContent value="recepcion">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Registrar Eventos Recibidos (SENT → RECEIVED)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Eventos Pendientes de Recepción ({eventosSent.length})
                  </p>

                  {loading ? (
                    <div className="text-center py-8">Cargando...</div>
                  ) : eventosSent.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      No hay eventos pendientes de recepción
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Origen</TableHead>
                            <TableHead>Destino</TableHead>
                            <TableHead>Fecha Programada</TableHead>
                            <TableHead>Número de Etiqueta</TableHead>
                            <TableHead>Fecha/Hora Recepción</TableHead>
                            <TableHead className="text-center">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eventosSent.map((evento) => {
                            const data = formData.get(evento.id);
                            return (
                              <TableRow key={evento.id}>
                                <TableCell className="font-mono text-sm">{evento.id}</TableCell>
                                <TableCell className="font-mono text-xs">{evento.nodo_origen}</TableCell>
                                <TableCell className="font-mono text-xs">{evento.nodo_destino}</TableCell>
                                <TableCell>
                                  {format(new Date(evento.fecha_programada), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {evento.numero_etiqueta || "N/A"}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="datetime-local"
                                    value={data?.fecha_recepcion || ""}
                                    onChange={(e) => updateFormData(evento.id, "fecha_recepcion", e.target.value)}
                                    className="w-full"
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    onClick={() => handleRegistrarRecepcion(evento.id)}
                                    disabled={loading}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Registrar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
