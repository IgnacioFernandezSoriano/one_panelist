import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Check, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AffectedEvent {
  id: number;
  fecha_programada: string;
  nodo_origen: string;
  nodo_destino: string;
  producto_nombre: string;
  carrier_nombre: string;
  plan_id: number;
}

interface AffectedEventsTableProps {
  events: AffectedEvent[];
  availableNodes: { codigo: string; panelista_nombre: string | null }[];
  onSaveEvent: (eventId: number, updates: Partial<AffectedEvent>) => Promise<void>;
}

interface EditingState {
  eventId: number | null;
  fecha_programada?: Date;
  nodo_origen?: string;
  nodo_destino?: string;
}

export const AffectedEventsTable = ({ events, availableNodes, onSaveEvent }: AffectedEventsTableProps) => {
  const [editing, setEditing] = useState<EditingState>({ eventId: null });
  const [saving, setSaving] = useState(false);

  const handleEdit = (event: AffectedEvent) => {
    setEditing({
      eventId: event.id,
      fecha_programada: new Date(event.fecha_programada),
      nodo_origen: event.nodo_origen,
      nodo_destino: event.nodo_destino,
    });
  };

  const handleSave = async () => {
    if (!editing.eventId) return;
    
    setSaving(true);
    try {
      const updates: Partial<AffectedEvent> = {};
      if (editing.fecha_programada) {
        updates.fecha_programada = format(editing.fecha_programada, 'yyyy-MM-dd');
      }
      if (editing.nodo_origen) updates.nodo_origen = editing.nodo_origen;
      if (editing.nodo_destino) updates.nodo_destino = editing.nodo_destino;

      await onSaveEvent(editing.eventId, updates);
      setEditing({ eventId: null });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing({ eventId: null });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Eventos Afectados <span className="text-muted-foreground">({events.length})</span>
        </h3>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Fecha Programada</TableHead>
                <TableHead className="w-[180px]">Nodo Origen</TableHead>
                <TableHead className="w-[180px]">Nodo Destino</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead className="w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No hay eventos afectados
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => {
                  const isEditing = editing.eventId === event.id;

                  return (
                    <TableRow 
                      key={event.id}
                      className={cn(
                        "transition-colors",
                        isEditing && "bg-warning/5"
                      )}
                    >
                      <TableCell>
                        {isEditing ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !editing.fecha_programada && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {editing.fecha_programada ? (
                                  format(editing.fecha_programada, "dd/MM/yyyy", { locale: es })
                                ) : (
                                  <span>Seleccionar</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={editing.fecha_programada}
                                onSelect={(date) =>
                                  setEditing((prev) => ({
                                    ...prev,
                                    fecha_programada: date,
                                  }))
                                }
                                initialFocus
                                locale={es}
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-sm">
                            {format(new Date(event.fecha_programada), "dd/MM/yyyy", { locale: es })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editing.nodo_origen}
                            onValueChange={(value) =>
                              setEditing((prev) => ({ ...prev, nodo_origen: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableNodes.map((node) => (
                                <SelectItem key={node.codigo} value={node.codigo}>
                                  <div className="flex flex-col">
                                    <span className="font-mono text-sm">{node.codigo}</span>
                                    {node.panelista_nombre && (
                                      <span className="text-xs text-muted-foreground">
                                        {node.panelista_nombre}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="font-mono text-sm">{event.nodo_origen}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editing.nodo_destino}
                            onValueChange={(value) =>
                              setEditing((prev) => ({ ...prev, nodo_destino: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableNodes.map((node) => (
                                <SelectItem key={node.codigo} value={node.codigo}>
                                  <div className="flex flex-col">
                                    <span className="font-mono text-sm">{node.codigo}</span>
                                    {node.panelista_nombre && (
                                      <span className="text-xs text-muted-foreground">
                                        {node.panelista_nombre}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="font-mono text-sm">{event.nodo_destino}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{event.producto_nombre}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{event.carrier_nombre}</Badge>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={saving}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                              disabled={saving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(event)}
                          >
                            Editar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
