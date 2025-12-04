import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, Users, Calendar, Globe } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Cliente {
  id: number;
  nombre: string;
  tipo_dias: string;
  idioma: string;
  max_events_per_week: number;
  estado: string;
  fecha_alta: string;
  admin_count?: number;
}

interface TablaCuentasProps {
  clientes: Cliente[];
  loading: boolean;
  onCambiarEstado: (clienteId: number, nuevoEstado: string) => void;
  onRecargar: () => void;
}

const idiomaLabels: Record<string, string> = {
  SP: "Español",
  EN: "English",
  FR: "Français",
  AR: "العربية",
};

export default function TablaCuentas({
  clientes,
  loading,
  onCambiarEstado,
}: TablaCuentasProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando cuentas...</p>
        </div>
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <div className="text-center py-12 bg-card border rounded-lg">
        <p className="text-muted-foreground">No hay cuentas registradas</p>
        <p className="text-sm text-muted-foreground mt-1">
          Crea la primera cuenta usando el botón "Nueva Cuenta"
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cuenta</TableHead>
            <TableHead>Idioma</TableHead>
            <TableHead>Tipo Días</TableHead>
            <TableHead>Max Eventos/Sem</TableHead>
            <TableHead>Admins</TableHead>
            <TableHead>Fecha Alta</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((cliente) => (
            <TableRow key={cliente.id}>
              <TableCell className="font-medium">{cliente.nombre}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {idiomaLabels[cliente.idioma] || cliente.idioma}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {cliente.tipo_dias}
                </div>
              </TableCell>
              <TableCell className="text-center">{cliente.max_events_per_week}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {cliente.admin_count || 0}
                </div>
              </TableCell>
              <TableCell>
                {format(new Date(cliente.fecha_alta), "dd MMM yyyy", { locale: es })}
              </TableCell>
              <TableCell>
                {cliente.estado === "activo" ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Activa
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Inactiva
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {cliente.estado === "activo" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCambiarEstado(cliente.id, "inactivo")}
                  >
                    Desactivar
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onCambiarEstado(cliente.id, "activo")}
                  >
                    Activar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
