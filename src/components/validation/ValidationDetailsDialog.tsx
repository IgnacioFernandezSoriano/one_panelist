import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

interface ValidationError {
  codigo: string;
  severidad: 'critical' | 'warning' | 'info';
  campo: string;
  descripcion: string;
  detalle: string;
}

interface ValidationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validaciones: ValidationError[];
  envioId: number;
}

export default function ValidationDetailsDialog({
  open,
  onOpenChange,
  validaciones,
  envioId,
}: ValidationDetailsDialogProps) {
  const criticalErrors = validaciones.filter(v => v.severidad === 'critical');
  const warnings = validaciones.filter(v => v.severidad === 'warning');
  const infoItems = validaciones.filter(v => v.severidad === 'info');

  const getSeverityIcon = (severidad: string) => {
    switch (severidad) {
      case 'critical':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severidad: string) => {
    switch (severidad) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const renderErrorGroup = (errors: ValidationError[], title: string, defaultOpen: boolean = false) => {
    if (errors.length === 0) return null;

    return (
      <AccordionItem value={title}>
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <span>{title}</span>
            <Badge variant="outline">{errors.length}</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3">
            {errors.map((error, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {getSeverityIcon(error.severidad)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getSeverityColor(error.severidad) as any}>
                        {error.severidad.toUpperCase()}
                      </Badge>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">
                        {error.codigo}
                      </code>
                      <span className="text-xs text-muted-foreground">
                        Campo: <strong>{error.campo}</strong>
                      </span>
                    </div>
                    <p className="font-medium">{error.descripcion}</p>
                    <p className="text-sm text-muted-foreground">{error.detalle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Validation Details - Event #{envioId}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-destructive">{criticalErrors.length}</div>
              <div className="text-sm text-muted-foreground">Critical Errors</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-warning">{warnings.length}</div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-info">{infoItems.length}</div>
              <div className="text-sm text-muted-foreground">Info</div>
            </div>
          </div>

          <Accordion type="multiple" defaultValue={criticalErrors.length > 0 ? ["Critical Errors"] : []}>
            {renderErrorGroup(criticalErrors, "Critical Errors", true)}
            {renderErrorGroup(warnings, "Warnings")}
            {renderErrorGroup(infoItems, "Informational")}
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
}
