import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ValidationRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ValidationRule {
  codigo: string;
  severidad: 'critical' | 'warning' | 'info';
  campo: string;
  descripcion: string;
  detalle: string;
  ejemplo?: string;
}

const validationRules: ValidationRule[] = [
  {
    codigo: 'VAL001',
    severidad: 'critical',
    campo: 'numero_etiqueta',
    descripcion: 'Tracking number is missing',
    detalle: 'The event must have a valid tracking number before it can be validated and moved to the quality database.',
    ejemplo: 'Tracking number: "TRACK-12345" or any alphanumeric identifier'
  },
  {
    codigo: 'VAL002',
    severidad: 'critical',
    campo: 'fecha_envio_real',
    descripcion: 'Actual send date is missing',
    detalle: 'The event must have a valid send date that indicates when the shipment was actually sent by the origin panelist.',
    ejemplo: 'Send date: "2025-11-06 10:30:00"'
  },
  {
    codigo: 'VAL003',
    severidad: 'critical',
    campo: 'fecha_recepcion_real',
    descripcion: 'Actual receive date is missing',
    detalle: 'The event must have a valid receive date that indicates when the shipment was actually received by the destination panelist.',
    ejemplo: 'Receive date: "2025-11-08 14:45:00"'
  },
  {
    codigo: 'VAL004',
    severidad: 'critical',
    campo: 'fecha_envio_real',
    descripcion: 'Send date is after receive date',
    detalle: 'The send date must be chronologically before the receive date. This validation ensures data integrity and prevents impossible transit times.',
    ejemplo: 'Send: 2025-11-06, Receive: 2025-11-08 ✓ (valid)\nSend: 2025-11-10, Receive: 2025-11-08 ✗ (invalid)'
  }
];

export default function ValidationRulesDialog({ open, onOpenChange }: ValidationRulesDialogProps) {
  const getSeverityIcon = (severidad: string) => {
    switch (severidad) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'info':
        return <Info className="h-5 w-5 text-info" />;
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

  const criticalRules = validationRules.filter(r => r.severidad === 'critical');
  const warningRules = validationRules.filter(r => r.severidad === 'warning');
  const infoRules = validationRules.filter(r => r.severidad === 'info');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Validation Rules Manual
          </DialogTitle>
          <DialogDescription>
            Complete guide to all validation rules applied to events before they are moved to the quality database
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">How Validation Works</h3>
            <p className="text-sm text-muted-foreground mb-3">
              When a panelist registers the reception of an event (status: RECEIVED), the system automatically runs a series of validation checks. 
              Events that pass all validations are immediately moved to the <strong>Real Events</strong> database for quality analysis. 
              Events that fail one or more validations are moved to <strong>Pending Validation Events</strong> for manual review.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Pass → Real Events (VALIDATED)
              </Badge>
              <Badge variant="outline" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Fail → Pending Validation (VALIDATION_FAILED)
              </Badge>
            </div>
          </div>

          {/* Severity Levels */}
          <div>
            <h3 className="font-semibold mb-3">Severity Levels</h3>
            <div className="grid gap-2">
              <div className="flex items-start gap-2 p-2 border rounded">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <div className="font-medium">Critical</div>
                  <div className="text-sm text-muted-foreground">
                    Must be resolved. Event cannot be validated until fixed.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 border rounded">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <div className="font-medium">Warning</div>
                  <div className="text-sm text-muted-foreground">
                    Should be reviewed. May indicate data quality issues.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 border rounded">
                <Info className="h-5 w-5 text-info mt-0.5" />
                <div>
                  <div className="font-medium">Info</div>
                  <div className="text-sm text-muted-foreground">
                    Informational only. Does not block validation.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Rules */}
          <div>
            <h3 className="font-semibold mb-3">Validation Rules</h3>
            
            <Accordion type="single" collapsible className="w-full">
              {/* Critical Rules */}
              {criticalRules.length > 0 && (
                <AccordionItem value="critical">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span>Critical Rules</span>
                      <Badge variant="destructive">{criticalRules.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {criticalRules.map((rule) => (
                        <div key={rule.codigo} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(rule.severidad)}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={getSeverityColor(rule.severidad) as any}>
                                  {rule.severidad.toUpperCase()}
                                </Badge>
                                <code className="text-xs bg-muted px-2 py-0.5 rounded">
                                  {rule.codigo}
                                </code>
                                <span className="text-xs text-muted-foreground">
                                  Field: <strong>{rule.campo}</strong>
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{rule.descripcion}</div>
                                <p className="text-sm text-muted-foreground mt-1">{rule.detalle}</p>
                              </div>
                              {rule.ejemplo && (
                                <div className="bg-muted p-2 rounded text-xs">
                                  <div className="font-medium mb-1">Example:</div>
                                  <pre className="whitespace-pre-wrap">{rule.ejemplo}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Warning Rules */}
              {warningRules.length > 0 && (
                <AccordionItem value="warning">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span>Warning Rules</span>
                      <Badge variant="default">{warningRules.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {warningRules.map((rule) => (
                        <div key={rule.codigo} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(rule.severidad)}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={getSeverityColor(rule.severidad) as any}>
                                  {rule.severidad.toUpperCase()}
                                </Badge>
                                <code className="text-xs bg-muted px-2 py-0.5 rounded">
                                  {rule.codigo}
                                </code>
                                <span className="text-xs text-muted-foreground">
                                  Field: <strong>{rule.campo}</strong>
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{rule.descripcion}</div>
                                <p className="text-sm text-muted-foreground mt-1">{rule.detalle}</p>
                              </div>
                              {rule.ejemplo && (
                                <div className="bg-muted p-2 rounded text-xs">
                                  <div className="font-medium mb-1">Example:</div>
                                  <pre className="whitespace-pre-wrap">{rule.ejemplo}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Info Rules */}
              {infoRules.length > 0 && (
                <AccordionItem value="info">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-info" />
                      <span>Info Rules</span>
                      <Badge variant="secondary">{infoRules.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {infoRules.map((rule) => (
                        <div key={rule.codigo} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(rule.severidad)}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={getSeverityColor(rule.severidad) as any}>
                                  {rule.severidad.toUpperCase()}
                                </Badge>
                                <code className="text-xs bg-muted px-2 py-0.5 rounded">
                                  {rule.codigo}
                                </code>
                                <span className="text-xs text-muted-foreground">
                                  Field: <strong>{rule.campo}</strong>
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{rule.descripcion}</div>
                                <p className="text-sm text-muted-foreground mt-1">{rule.detalle}</p>
                              </div>
                              {rule.ejemplo && (
                                <div className="bg-muted p-2 rounded text-xs">
                                  <div className="font-medium mb-1">Example:</div>
                                  <pre className="whitespace-pre-wrap">{rule.ejemplo}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>

          {/* Actions */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Available Actions</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Approve:</strong> Manually approve the event and move it to Real Events database despite validation errors. 
                Use this when you've verified the data is correct or the error can be safely ignored.
              </div>
              <div>
                <strong>Cancel:</strong> Mark the event as cancelled. The event will be excluded from quality analysis. 
                Use this for events that should not be processed (e.g., test shipments, errors).
              </div>
              <div>
                <strong>Quick Fix:</strong> Correct the validation errors directly and re-validate. 
                The system will automatically re-run validations after you fix the data.
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
