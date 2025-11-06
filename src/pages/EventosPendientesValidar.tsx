import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Search, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { QuickFixValidationForm } from "@/components/validation/QuickFixValidationForm";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import ValidationDetailsDialog from "@/components/validation/ValidationDetailsDialog";
import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

interface ValidationError {
  codigo: string;
  severidad: 'critical' | 'warning' | 'info';
  campo: string;
  descripcion: string;
  detalle: string;
}

interface PendingValidation {
  id: number;
  allocation_plan_detail_id: number;
  cliente_id: number;
  validaciones_fallidas: Json;
  estado: string;
  created_at: string;
  generated_allocation_plan_details: {
    id: number;
    cliente_id: number;
    nodo_origen: string;
    nodo_destino: string;
    fecha_programada: string;
    numero_etiqueta: string | null;
    carrier_id: number | null;
    producto_id: number | null;
    fecha_envio_real: string | null;
    fecha_recepcion_real: string | null;
    status: string;
  };
}

function parseValidationErrors(json: Json): ValidationError[] {
  if (Array.isArray(json)) {
    return json as unknown as ValidationError[];
  }
  return [];
}

export default function EventosPendientesValidar() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [validations, setValidations] = useState<PendingValidation[]>([]);
  const [filteredValidations, setFilteredValidations] = useState<PendingValidation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedValidation, setSelectedValidation] = useState<PendingValidation | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: 'approve' | 'cancel' | null; validation: PendingValidation | null }>({
    open: false,
    type: null,
    validation: null
  });
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0
  });

  useEffect(() => {
    loadValidations();
  }, []);

  useEffect(() => {
    filterValidations();
  }, [validations, searchTerm, severityFilter]);

  const loadValidations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('allocation_plan_validacion_pendiente')
        .select(`
          *,
          generated_allocation_plan_details (
            id,
            cliente_id,
            nodo_origen,
            nodo_destino,
            fecha_programada,
            numero_etiqueta,
            carrier_id,
            producto_id,
            fecha_envio_real,
            fecha_recepcion_real,
            status
          )
        `)
        .eq('estado', 'pending_review')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setValidations(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: PendingValidation[]) => {
    const stats = {
      total: data.length,
      critical: 0,
      warning: 0,
      info: 0
    };

    data.forEach(v => {
      const errors = parseValidationErrors(v.validaciones_fallidas);
      errors.forEach(error => {
        if (error.severidad === 'critical') stats.critical++;
        else if (error.severidad === 'warning') stats.warning++;
        else if (error.severidad === 'info') stats.info++;
      });
    });

    setStats(stats);
  };

  const filterValidations = () => {
    let filtered = [...validations];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.envio_id.toString().includes(term) ||
        v.envios.nodo_origen.toLowerCase().includes(term) ||
        v.envios.nodo_destino.toLowerCase().includes(term) ||
        v.envios.numero_etiqueta?.toLowerCase().includes(term) ||
        v.envios.carrier_name?.toLowerCase().includes(term)
      );
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter(v => {
        const errors = parseValidationErrors(v.validaciones_fallidas);
        return errors.some(e => e.severidad === severityFilter);
      });
    }

    setFilteredValidations(filtered);
  };

  const handleApprove = async (validation: PendingValidation) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const detail = validation.generated_allocation_plan_details;
      
      // Calculate transit time
      const transitDays = detail.fecha_envio_real && detail.fecha_recepcion_real
        ? Math.floor((new Date(detail.fecha_recepcion_real).getTime() - new Date(detail.fecha_envio_real).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      
      const transitHours = detail.fecha_envio_real && detail.fecha_recepcion_real
        ? (new Date(detail.fecha_recepcion_real).getTime() - new Date(detail.fecha_envio_real).getTime()) / (1000 * 60 * 60)
        : null;
      
      // Insert into eventos_reales
      const { error: insertError } = await supabase
        .from('eventos_reales')
        .insert({
          allocation_plan_detail_id: detail.id,
          cliente_id: detail.cliente_id,
          carrier_id: detail.carrier_id,
          producto_id: detail.producto_id,
          nodo_origen: detail.nodo_origen,
          nodo_destino: detail.nodo_destino,
          fecha_programada: detail.fecha_programada,
          fecha_envio_real: detail.fecha_envio_real,
          fecha_recepcion_real: detail.fecha_recepcion_real,
          tiempo_transito_dias: transitDays,
          tiempo_transito_horas: transitHours,
          numero_etiqueta: detail.numero_etiqueta,
          validado_por: user?.id ? parseInt(user.id) : null
        });

      if (insertError) throw insertError;

      // Update allocation plan detail status to VALIDATED
      const { error: updateError } = await supabase
        .from('generated_allocation_plan_details')
        .update({ status: 'VALIDATED' })
        .eq('id', detail.id);

      if (updateError) throw updateError;

      // Update validation record
      const { error: validationError } = await supabase
        .from('allocation_plan_validacion_pendiente')
        .update({ 
          estado: 'approved',
          resuelto_por: user?.id ? parseInt(user.id) : null,
          fecha_resolucion: new Date().toISOString()
        })
        .eq('id', validation.id);

      if (validationError) throw validationError;

      toast({
        title: "Success",
        description: "Event approved and moved to quality database",
      });

      loadValidations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = async (validation: PendingValidation) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update allocation plan detail to CANCELLED
      const { error: updateError } = await supabase
        .from('generated_allocation_plan_details')
        .update({ 
          status: 'CANCELLED'
        })
        .eq('id', validation.generated_allocation_plan_details.id);

      if (updateError) throw updateError;

      // Update validation record
      const { error: validationError } = await supabase
        .from('allocation_plan_validacion_pendiente')
        .update({ 
          estado: 'cancelled',
          resuelto_por: user?.id ? parseInt(user.id) : null,
          fecha_resolucion: new Date().toISOString()
        })
        .eq('id', validation.id);

      if (validationError) throw validationError;

      toast({
        title: "Success",
        description: "Event cancelled successfully",
      });

      loadValidations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSeverityBadge = (validaciones: Json) => {
    const errors = parseValidationErrors(validaciones);
    const critical = errors.filter(v => v.severidad === 'critical').length;
    const warning = errors.filter(v => v.severidad === 'warning').length;
    const info = errors.filter(v => v.severidad === 'info').length;

    return (
      <div className="flex gap-1">
        {critical > 0 && (
          <Badge variant="destructive" className="text-xs">
            {critical} Critical
          </Badge>
        )}
        {warning > 0 && (
          <Badge variant="default" className="text-xs">
            {warning} Warning
          </Badge>
        )}
        {info > 0 && (
          <Badge variant="secondary" className="text-xs">
            {info} Info
          </Badge>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Pending Validation Events
          </h1>
          <p className="text-muted-foreground">
            Review and validate events that require manual approval
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.warning}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Info Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">{stats.info}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex gap-4 flex-wrap items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, node, carrier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Event ID</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Tracking #</TableHead>
                <TableHead>Errors</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredValidations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No pending validations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredValidations.map((validation) => (
                  <>
                    <TableRow key={validation.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedRow(expandedRow === validation.id ? null : validation.id)}
                        >
                          {expandedRow === validation.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">#{validation.allocation_plan_detail_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">{validation.generated_allocation_plan_details.nodo_origen}</span>
                          <span>→</span>
                          <span className="font-mono text-xs">{validation.generated_allocation_plan_details.nodo_destino}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(validation.generated_allocation_plan_details.fecha_programada), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="font-mono text-xs">
                        {validation.generated_allocation_plan_details.numero_etiqueta || '-'}
                      </TableCell>
                      <TableCell>{getSeverityBadge(validation.validaciones_fallidas)}</TableCell>
                      <TableCell>
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Info className="h-4 w-4" />
                            </Button>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Quick Summary:</p>
                              {parseValidationErrors(validation.validaciones_fallidas).slice(0, 3).map((error, idx) => (
                                <div key={idx} className="text-xs border-l-2 pl-2 border-muted">
                                  <Badge variant={error.severidad === 'critical' ? 'destructive' : 'default'} className="text-xs mb-1">
                                    {error.severidad}
                                  </Badge>
                                  <p className="font-medium">{error.descripcion}</p>
                                </div>
                              ))}
                              {parseValidationErrors(validation.validaciones_fallidas).length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{parseValidationErrors(validation.validaciones_fallidas).length - 3} more...
                                </p>
                              )}
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedValidation(validation);
                              setDetailsDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActionDialog({ open: true, type: 'approve', validation })}
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActionDialog({ open: true, type: 'cancel', validation })}
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRow === validation.id && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/30 p-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold">Quick Fix Event #{validation.envio_id}</h3>
                            </div>
                            
                            {/* Validation Errors Summary */}
                            <div className="bg-background border rounded-lg p-4 mb-4">
                              <h4 className="text-sm font-semibold mb-2">Validation Issues to Fix:</h4>
                              <div className="space-y-2">
                                {parseValidationErrors(validation.validaciones_fallidas).map((error, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-sm">
                                    <Badge variant={error.severidad === 'critical' ? 'destructive' : error.severidad === 'warning' ? 'default' : 'secondary'}>
                                      {error.severidad}
                                    </Badge>
                                    <div className="flex-1">
                                      <p className="font-medium">{error.descripcion}</p>
                                      <p className="text-xs text-muted-foreground">{error.detalle}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Quick Fix Form - Only shows relevant fields */}
                            <QuickFixValidationForm
                              envio={validation.envios}
                              validationErrors={parseValidationErrors(validation.validaciones_fallidas)}
                              onSuccess={() => {
                                setExpandedRow(null);
                                loadValidations();
                                toast({
                                  title: "Success",
                                  description: "Event corrected. Run validation again to verify.",
                                });
                              }}
                              onCancel={() => setExpandedRow(null)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Validation Details Dialog */}
      {selectedValidation && (
        <ValidationDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          validaciones={parseValidationErrors(selectedValidation.validaciones_fallidas)}
          envioId={selectedValidation.envio_id}
        />
      )}

      {/* Action Confirmation Dialog */}
      <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.type === 'approve' ? 'Approve Event?' : 'Cancel Event?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.type === 'approve'
                ? 'This will move the event to the quality database despite validation warnings. Are you sure?'
                : 'This will mark the event as CANCELLED and it will not be included in quality reports. Are you sure?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (actionDialog.validation) {
                  if (actionDialog.type === 'approve') {
                    handleApprove(actionDialog.validation);
                  } else {
                    handleCancel(actionDialog.validation);
                  }
                }
                setActionDialog({ open: false, type: null, validation: null });
              }}
            >
              Yes, {actionDialog.type === 'approve' ? 'approve' : 'cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
