import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useCliente } from "@/contexts/ClienteContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Calendar, ChevronDown, ChevronRight, Save, X, UserX, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, addWeeks, parseISO } from "date-fns";

interface UnassignedEvent {
  id: number;
  plan_id: number;
  plan_name: string;
  fecha_programada: string;
  nodo_origen: string;
  nodo_destino: string;
  ciudad_origen: string;
  ciudad_destino: string;
  ciudad_origen_clasificacion: string;
  ciudad_destino_clasificacion: string;
  region_origen_id: number | null;
  region_destino_id: number | null;
  panelista_origen_id: number | null;
  panelista_destino_id: number | null;
  panelista_origen_nombre: string | null;
  panelista_destino_nombre: string | null;
  producto_nombre: string;
  carrier_nombre: string;
  status: string;
  issue_type: 'sin_panelista_origen' | 'sin_panelista_destino' | 'baja_origen' | 'baja_destino';
  issue_description: string;
  nodo_origen_data?: { ciudad_id: number };
  nodo_destino_data?: { ciudad_id: number };
}

interface PanelistaDisponible {
  id: number;
  nombre_completo: string;
  nodo_asignado: string;
  carga_semanal: { semana: string; eventos: number }[];
}

export default function UnassignedEvents() {
  const { clienteId } = useCliente();
  const [events, setEvents] = useState<UnassignedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<number | null>(null);
  const [editedDate, setEditedDate] = useState<string>("");
  const [panelistasDisponibles, setPanelistasDisponibles] = useState<PanelistaDisponible[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (clienteId) {
      loadUnassignedEvents();
    }
  }, [clienteId]);

  const loadUnassignedEvents = async () => {
    if (!clienteId) return;
    
    setLoading(true);
    try {
      // PASO 1: Obtener panelistas con nodo asignado
      const { data: panelistas, error: panelistasError } = await supabase
        .from('panelistas')
        .select('id, nodo_asignado, nombre_completo, estado')
        .eq('cliente_id', clienteId)
        .not('nodo_asignado', 'is', null);

      if (panelistasError) throw panelistasError;

      // Crear mapa de nodo → panelista
      const panelistasByNodo = new Map<string, any>();
      panelistas?.forEach(p => {
        if (p.nodo_asignado) {
          panelistasByNodo.set(p.nodo_asignado, p);
        }
      });

      // PASO 2: Obtener bajas de panelistas
      const { data: bajas, error: bajasError } = await supabase
        .from('panelist_vacations')
        .select('panelista_id, fecha_inicio, fecha_fin')
        .eq('cliente_id', clienteId);

      if (bajasError) throw bajasError;

      // PASO 3: Obtener eventos del allocation plan
      const { data: planEvents, error: eventsError } = await supabase
        .from('generated_allocation_plan_details')
        .select(`
          id,
          generated_allocation_plan_id,
          nodo_origen,
          nodo_destino,
          fecha_programada,
          status,
          generated_allocation_plans!inner(nombre, cliente_id),
          productos(nombre_producto),
          carriers(legal_name),
          nodo_origen_data:nodos!generated_allocation_plan_details_nodo_origen_fkey(
            codigo,
            ciudad,
            ciudad_id,
            ciudades(clasificacion, region_id)
          ),
          nodo_destino_data:nodos!generated_allocation_plan_details_nodo_destino_fkey(
            codigo,
            ciudad,
            ciudad_id,
            ciudades(clasificacion, region_id)
          )
        `)
        .eq('generated_allocation_plans.cliente_id', clienteId)
        .in('status', ['NOTIFIED', 'PENDING']);

      if (eventsError) throw eventsError;

      // PASO 4: Identificar eventos con problemas
      const problematicEvents: UnassignedEvent[] = [];

      planEvents?.forEach((event: any) => {
        const fechaEvento = parseISO(event.fecha_programada);
        
        // Verificar nodo origen
        const panelistaOrigen = panelistasByNodo.get(event.nodo_origen);
        let problemaOrigen: string | null = null;
        let tipoProblemaOrigen: UnassignedEvent['issue_type'] | null = null;

        if (!panelistaOrigen) {
          problemaOrigen = 'Sin panelista asignado';
          tipoProblemaOrigen = 'sin_panelista_origen';
        } else {
          // Verificar si está de baja en la fecha del evento
          const bajasDelPanelista = bajas?.filter(b => b.panelista_id === panelistaOrigen.id);
          const estaDeBaja = bajasDelPanelista?.some(baja => {
            const inicio = parseISO(baja.fecha_inicio);
            const fin = parseISO(baja.fecha_fin);
            return fechaEvento >= inicio && fechaEvento <= fin;
          });

          if (estaDeBaja) {
            problemaOrigen = 'Panelista de baja temporal';
            tipoProblemaOrigen = 'baja_origen';
          }
        }

        // Verificar nodo destino
        const panelistaDestino = panelistasByNodo.get(event.nodo_destino);
        let problemaDestino: string | null = null;
        let tipoProblemaDestino: UnassignedEvent['issue_type'] | null = null;

        if (!panelistaDestino) {
          problemaDestino = 'Sin panelista asignado';
          tipoProblemaDestino = 'sin_panelista_destino';
        } else {
          // Verificar si está de baja en la fecha del evento
          const bajasDelPanelista = bajas?.filter(b => b.panelista_id === panelistaDestino.id);
          const estaDeBaja = bajasDelPanelista?.some(baja => {
            const inicio = parseISO(baja.fecha_inicio);
            const fin = parseISO(baja.fecha_fin);
            return fechaEvento >= inicio && fechaEvento <= fin;
          });

          if (estaDeBaja) {
            problemaDestino = 'Panelista de baja temporal';
            tipoProblemaDestino = 'baja_destino';
          }
        }

        // Si hay algún problema, agregar a la lista
        if (problemaOrigen || problemaDestino) {
          const issueType = tipoProblemaOrigen || tipoProblemaDestino!;
          const issueDescription = problemaOrigen 
            ? `Origen: ${problemaOrigen}${problemaDestino ? ` | Destino: ${problemaDestino}` : ''}`
            : `Destino: ${problemaDestino}`;

          problematicEvents.push({
            id: event.id,
            plan_id: event.generated_allocation_plan_id,
            plan_name: event.generated_allocation_plans.nombre,
            fecha_programada: event.fecha_programada,
            nodo_origen: event.nodo_origen,
            nodo_destino: event.nodo_destino,
            ciudad_origen: event.nodo_origen_data?.ciudad || '',
            ciudad_destino: event.nodo_destino_data?.ciudad || '',
            ciudad_origen_clasificacion: event.nodo_origen_data?.ciudades?.clasificacion || 'urbano',
            ciudad_destino_clasificacion: event.nodo_destino_data?.ciudades?.clasificacion || 'urbano',
            region_origen_id: event.nodo_origen_data?.ciudades?.region_id || null,
            region_destino_id: event.nodo_destino_data?.ciudades?.region_id || null,
            panelista_origen_id: panelistaOrigen?.id || null,
            panelista_destino_id: panelistaDestino?.id || null,
            panelista_origen_nombre: panelistaOrigen?.nombre_completo || null,
            panelista_destino_nombre: panelistaDestino?.nombre_completo || null,
            producto_nombre: event.productos?.nombre_producto || 'N/A',
            carrier_nombre: event.carriers?.legal_name || 'N/A',
            status: event.status,
            issue_type: issueType,
            issue_description: issueDescription,
            nodo_origen_data: event.nodo_origen_data,
            nodo_destino_data: event.nodo_destino_data,
          });
        }
      });

      setEvents(problematicEvents);
      console.log('Eventos con problemas:', problematicEvents.length);
    } catch (error: any) {
      toast({
        title: "Error loading unassigned events",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEvent = async (eventId: number) => {
    try {
      const { error } = await supabase
        .from('generated_allocation_plan_details')
        .update({ status: 'CANCELLED' })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Event cancelled",
        description: "The event has been marked as cancelled",
      });

      loadUnassignedEvents();
    } catch (error: any) {
      toast({
        title: "Error cancelling event",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveDate = async (eventId: number) => {
    if (!editedDate) return;

    try {
      const { error } = await supabase
        .from('generated_allocation_plan_details')
        .update({ fecha_programada: editedDate })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Date updated",
        description: "The event date has been updated successfully",
      });

      setEditingEvent(null);
      setEditedDate("");
      loadUnassignedEvents();
    } catch (error: any) {
      toast({
        title: "Error updating date",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getIssueBadge = (issueType: UnassignedEvent['issue_type']) => {
    const variants: Record<string, { variant: "destructive" | "secondary" | "outline"; label: string }> = {
      sin_panelista_origen: { variant: "destructive", label: "No Panelist (Origin)" },
      sin_panelista_destino: { variant: "destructive", label: "No Panelist (Dest)" },
      baja_origen: { variant: "secondary", label: "On Leave (Origin)" },
      baja_destino: { variant: "secondary", label: "On Leave (Dest)" },
    };

    const config = variants[issueType];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const loadAvailablePanelists = async (event: UnassignedEvent, nodeType: 'origen' | 'destino') => {
    if (!clienteId) return;

    try {
      const ciudadId = nodeType === 'origen' ? event.nodo_origen_data?.ciudad_id : event.nodo_destino_data?.ciudad_id;
      const regionId = nodeType === 'origen' ? event.region_origen_id : event.region_destino_id;
      const clasificacion = nodeType === 'origen' ? event.ciudad_origen_clasificacion : event.ciudad_destino_clasificacion;

      let query = supabase
        .from('panelistas')
        .select('id, nombre_completo, nodo_asignado, nodos!inner(ciudad_id, ciudades!inner(region_id))')
        .eq('cliente_id', clienteId)
        .eq('estado', 'activo')
        .not('nodo_asignado', 'is', null);

      // Filtrar según clasificación de ciudad
      if (clasificacion === 'A' || clasificacion === 'B') {
        // Ciudad tipo A o B: panelistas de la misma ciudad
        query = query.eq('nodos.ciudad_id', ciudadId);
      } else {
        // Ciudad tipo C: panelistas de la misma región
        query = query.eq('nodos.ciudades.region_id', regionId);
      }

      const { data: panelistas, error } = await query;

      if (error) throw error;

      // Calcular carga semanal para cada panelista
      const panelistasConCarga: PanelistaDisponible[] = await Promise.all(
        (panelistas || []).map(async (p) => {
          const cargaSemanal = await calculateWeeklyLoad(p.id, event.fecha_programada);
          return {
            id: p.id,
            nombre_completo: p.nombre_completo,
            nodo_asignado: p.nodo_asignado,
            carga_semanal: cargaSemanal,
          };
        })
      );

      setPanelistasDisponibles(panelistasConCarga);
    } catch (error: any) {
      toast({
        title: "Error loading panelists",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateWeeklyLoad = async (panelistaId: number, fechaEvento: string) => {
    const eventDate = parseISO(fechaEvento);
    const weeks = [];

    // Calcular carga para 4 semanas (semana actual + 3 siguientes)
    for (let i = 0; i < 4; i++) {
      const weekStart = startOfWeek(addWeeks(eventDate, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(addWeeks(eventDate, i), { weekStartsOn: 1 });

      const { data: eventos, error } = await supabase
        .from('generated_allocation_plan_details')
        .select('id')
        .or(`panelista_origen_id.eq.${panelistaId},panelista_destino_id.eq.${panelistaId}`)
        .gte('fecha_programada', weekStart.toISOString())
        .lte('fecha_programada', weekEnd.toISOString())
        .in('status', ['NOTIFIED', 'PENDING', 'SENT']);

      if (!error) {
        weeks.push({
          semana: `Week ${i + 1} (${format(weekStart, 'dd MMM')})`,
          eventos: eventos?.length || 0,
        });
      }
    }

    return weeks;
  };

  const handleReassignPanelist = async (eventId: number, nodeType: 'origen' | 'destino', panelistaId: number) => {
    try {
      const field = nodeType === 'origen' ? 'panelista_origen_id' : 'panelista_destino_id';
      
      const { error } = await supabase
        .from('generated_allocation_plan_details')
        .update({ [field]: panelistaId })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Panelist reassigned",
        description: `The panelist has been successfully reassigned to the ${nodeType} node`,
      });

      setExpandedRow(null);
      setPanelistasDisponibles([]);
      loadUnassignedEvents();
    } catch (error: any) {
      toast({
        title: "Error reassigning panelist",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const renderPanelistReassignment = (event: UnassignedEvent) => {
    const needsOrigenReassignment = event.issue_type === 'sin_panelista_origen' || event.issue_type === 'baja_origen';
    const needsDestinoReassignment = event.issue_type === 'sin_panelista_destino' || event.issue_type === 'baja_destino';

    return (
      <div className="space-y-4">
        {needsOrigenReassignment && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold text-sm">Reassign Origin Panelist</h5>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadAvailablePanelists(event, 'origen')}
              >
                <Users className="w-4 h-4 mr-2" />
                Load Available Panelists
              </Button>
            </div>
            {panelistasDisponibles.length > 0 && renderPanelistList(event, 'origen')}
          </div>
        )}

        {needsDestinoReassignment && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold text-sm">Reassign Destination Panelist</h5>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadAvailablePanelists(event, 'destino')}
              >
                <Users className="w-4 h-4 mr-2" />
                Load Available Panelists
              </Button>
            </div>
            {panelistasDisponibles.length > 0 && renderPanelistList(event, 'destino')}
          </div>
        )}
      </div>
    );
  };

  const renderPanelistList = (event: UnassignedEvent, nodeType: 'origen' | 'destino') => {
    return (
      <div className="mt-3 space-y-2">
        {panelistasDisponibles.map((panelista) => (
          <div key={panelista.id} className="border rounded p-3 hover:bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-sm">{panelista.nombre_completo}</p>
                <p className="text-xs text-muted-foreground">Node: {panelista.nodo_asignado}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleReassignPanelist(event.id, nodeType, panelista.id)}
              >
                Assign
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {panelista.carga_semanal.map((week, idx) => (
                <div key={idx} className="text-center p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">{week.semana}</p>
                  <p className="text-sm font-semibold">{week.eventos} events</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading unassigned events...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Unassigned Events</h1>
          <p className="text-muted-foreground">
            Events that cannot be processed due to missing or unavailable panelists
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{events.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">No Panelist</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {events.filter(e => e.issue_type.includes('sin_panelista')).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                {events.filter(e => e.issue_type.includes('baja')).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {new Set(events.map(e => e.plan_id)).size}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Events Requiring Attention</CardTitle>
            <CardDescription>
              {events.length} event{events.length !== 1 ? 's' : ''} with panelist issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No unassigned events found
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => (
                    <React.Fragment key={event.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedRow(expandedRow === event.id ? null : event.id)}
                          >
                            {expandedRow === event.id ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{event.plan_name}</TableCell>
                        <TableCell>
                          {editingEvent === event.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                value={editedDate}
                                onChange={(e) => setEditedDate(e.target.value)}
                                className="w-40"
                              />
                              <Button size="sm" onClick={() => handleSaveDate(event.id)}>
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingEvent(null);
                                  setEditedDate("");
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-2 cursor-pointer hover:text-primary"
                              onClick={() => {
                                setEditingEvent(event.id);
                                setEditedDate(event.fecha_programada.split('T')[0]);
                              }}
                            >
                              <Calendar className="w-4 h-4" />
                              {format(parseISO(event.fecha_programada), 'dd MMM yyyy')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{event.nodo_origen}</p>
                            <p className="text-xs text-muted-foreground">{event.ciudad_origen}</p>
                            {event.panelista_origen_nombre ? (
                              <p className="text-xs text-green-600">{event.panelista_origen_nombre}</p>
                            ) : (
                              <p className="text-xs text-red-600">No panelist</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{event.nodo_destino}</p>
                            <p className="text-xs text-muted-foreground">{event.ciudad_destino}</p>
                            {event.panelista_destino_nombre ? (
                              <p className="text-xs text-green-600">{event.panelista_destino_nombre}</p>
                            ) : (
                              <p className="text-xs text-red-600">No panelist</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{event.producto_nombre}</TableCell>
                        <TableCell>{getIssueBadge(event.issue_type)}</TableCell>
                        <TableCell>
                          <Badge variant={event.status === 'CANCELLED' ? 'secondary' : 'outline'}>
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {event.status !== 'CANCELLED' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelEvent(event.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Row - Placeholder for panelist reassignment */}
                      {expandedRow === event.id && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/20">
                            <div className="p-4 space-y-4">
                              <h4 className="font-semibold">Panelist Reassignment Options</h4>
                              {renderPanelistReassignment(event)}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
