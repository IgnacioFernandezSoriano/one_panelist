import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Calendar, MapPin, Package, Clock, User, CheckCircle, Truck } from "lucide-react";

interface EventoReal {
  id: number;
  envio_id: number;
  carrier_id: number | null;
  producto_id: number | null;
  nodo_origen: string;
  nodo_destino: string;
  panelista_origen_id: number | null;
  panelista_destino_id: number | null;
  fecha_programada: string;
  fecha_envio_real: string | null;
  fecha_recepcion_real: string | null;
  tiempo_transito_dias: number | null;
  numero_etiqueta: string | null;
  tipo_producto: string | null;
  carrier_name: string | null;
  fecha_validacion: string;
  validado_por: number | null;
  carriers?: {
    legal_name: string;
    carrier_code: string;
    commercial_name: string;
    status: string;
  };
  productos_cliente?: {
    nombre_producto: string;
    codigo_producto: string;
  };
  panelista_origen?: {
    nombre_completo: string;
  };
  panelista_destino?: {
    nombre_completo: string;
  };
  validado_por_usuario?: {
    nombre_completo: string;
  };
}

interface EventoRealDetailsDialogProps {
  evento: EventoReal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventoRealDetailsDialog({
  evento,
  open,
  onOpenChange,
}: EventoRealDetailsDialogProps) {
  if (!evento) return null;

  const getPerformanceBadge = (transitDays: number | null) => {
    if (!transitDays) return <Badge variant="outline">N/A</Badge>;
    
    if (transitDays <= 2) {
      return <Badge className="bg-green-500 text-white">Excellent</Badge>;
    } else if (transitDays <= 5) {
      return <Badge className="bg-blue-500 text-white">Normal</Badge>;
    } else if (transitDays <= 7) {
      return <Badge className="bg-yellow-500 text-white">Delayed</Badge>;
    } else {
      return <Badge className="bg-red-500 text-white">Very Delayed</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Validated Event #{evento.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Event Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event ID:</span>
                  <span className="font-mono">{evento.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Shipment ID:</span>
                  <span className="font-mono">{evento.envio_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tracking Number:</span>
                  <span className="font-mono">{evento.numero_etiqueta || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product Type:</span>
                  <span>{evento.tipo_producto || "N/A"}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Carrier Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carrier:</span>
                  <span className="font-medium">
                    {evento.carriers?.legal_name || evento.carrier_name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carrier Code:</span>
                  <span className="font-mono">{evento.carriers?.carrier_code || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commercial Name:</span>
                  <span>{evento.carriers?.commercial_name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={evento.carriers?.status === "active" ? "default" : "secondary"}>
                    {evento.carriers?.status || "N/A"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Product Information */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Product Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-medium">
                  {evento.productos_cliente?.nombre_producto || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product Code:</span>
                <span className="font-mono">
                  {evento.productos_cliente?.codigo_producto || "N/A"}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Route Information */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Route Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Origin Node</p>
                  <p className="text-lg font-semibold">{evento.nodo_origen}</p>
                  <p className="text-sm text-muted-foreground">
                    {evento.panelista_origen?.nombre_completo || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="text-2xl">↓</div>
                  <p className="text-xs">
                    {evento.tiempo_transito_dias ? `${evento.tiempo_transito_dias} days` : "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Destination Node</p>
                  <p className="text-lg font-semibold">{evento.nodo_destino}</p>
                  <p className="text-sm text-muted-foreground">
                    {evento.panelista_destino?.nombre_completo || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Scheduled Date:</span>
                <span className="font-medium">
                  {format(new Date(evento.fecha_programada), "dd/MM/yyyy")}
                </span>
              </div>
              {evento.fecha_envio_real && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Actual Send Date:</span>
                  <span className="font-medium">
                    {format(new Date(evento.fecha_envio_real), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
              )}
              {evento.fecha_recepcion_real && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Actual Receive Date:</span>
                  <span className="font-medium">
                    {format(new Date(evento.fecha_recepcion_real), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Performance */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Performance Analysis
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Transit Time:</span>
                <span className="font-bold text-lg">
                  {evento.tiempo_transito_dias ? `${evento.tiempo_transito_dias} days` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Performance:</span>
                {getPerformanceBadge(evento.tiempo_transito_dias)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Validation Information */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Validation Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Validated On:</span>
                <span className="font-medium">
                  {format(new Date(evento.fecha_validacion), "dd/MM/yyyy HH:mm")}
                </span>
              </div>
              {evento.validado_por_usuario && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Validated By:</span>
                  <span className="font-medium">
                    {evento.validado_por_usuario.nombre_completo}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
