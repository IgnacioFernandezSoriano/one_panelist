import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface AffectedEvent {
  id: number;
  fecha_programada: string;
  nodo_origen: string;
  nodo_destino: string;
  status: 'PENDING' | 'SENT' | 'RECEIVED' | 'NOTIFIED' | 'CANCELLED';
  plan_id: number;
}

interface AffectedEventsTableProps {
  events: AffectedEvent[];
  availableNodes: { codigo: string; panelista_nombre: string | null }[];
  onSaveEvent: (eventId: number, updates: Partial<AffectedEvent>) => Promise<void>;
}

export const AffectedEventsTable = ({ events, availableNodes, onSaveEvent }: AffectedEventsTableProps) => {
  const [savingId, setSavingId] = useState<number | null>(null);

  const handleFieldChange = async (eventId: number, field: string, value: any) => {
    setSavingId(eventId);
    try {
      const updates: any = {};
      if (field === 'fecha_programada') {
        updates.fecha_programada = format(value, 'yyyy-MM-dd');
      } else {
        updates[field] = value;
      }
      await onSaveEvent(eventId, updates);
    } finally {
      setSavingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: string }> = {
      'PENDING': { label: 'Pendiente', variant: 'outline' },
      'SENT': { label: 'Enviado', variant: 'default' },
      'RECEIVED': { label: 'Recibido', variant: 'default' },
      'NOTIFIED': { label: 'Notificado', variant: 'default' },
      'CANCELLED': { label: 'Cancelado', variant: 'destructive' },
    };
    
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    
    if (statusInfo.variant === 'destructive') {
      return <Badge variant="destructive">{statusInfo.label}</Badge>;
    }
    if (status === 'RECEIVED') {
      return <Badge className="bg-success text-success-foreground">{statusInfo.label}</Badge>;
    }
    return <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>;
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
                <TableHead className="w-[120px]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No hay eventos afectados
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => {
                  const isSaving = savingId === event.id;

                  return (
                    <TableRow 
                      key={event.id}
                      className={cn(
                        "transition-colors",
                        isSaving && "opacity-50"
                      )}
                    >
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              disabled={isSaving}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(new Date(event.fecha_programada), "dd/MM/yyyy", { locale: es })}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={new Date(event.fecha_programada)}
                              onSelect={(date) => {
                                if (date) {
                                  handleFieldChange(event.id, 'fecha_programada', date);
                                }
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              locale={es}
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={event.nodo_origen}
                          onValueChange={(value) =>
                            handleFieldChange(event.id, 'nodo_origen', value)
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              <span className="font-mono text-sm">{event.nodo_origen}</span>
                            </SelectValue>
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
                      </TableCell>
                      <TableCell>
                        <Select
                          value={event.nodo_destino}
                          onValueChange={(value) =>
                            handleFieldChange(event.id, 'nodo_destino', value)
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              <span className="font-mono text-sm">{event.nodo_destino}</span>
                            </SelectValue>
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
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(event.status)}
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
