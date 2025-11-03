import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

interface AvailabilityManagerProps {
  panelistaId: number;
  clienteId: number;
  currentStatus: string;
  currentLeaveStart?: string | null;
  currentLeaveEnd?: string | null;
  onUpdate: () => void;
}

interface AvailabilityLog {
  id: number;
  status: string;
  previous_status: string | null;
  leave_start_date: string | null;
  leave_end_date: string | null;
  reason: string | null;
  notes: string | null;
  changed_at: string;
  changed_by: number | null;
  usuarios?: { nombre_completo: string } | null;
}

export function AvailabilityManager({
  panelistaId,
  clienteId,
  currentStatus,
  currentLeaveStart,
  currentLeaveEnd,
  onUpdate
}: AvailabilityManagerProps) {
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logs, setLogs] = useState<AvailabilityLog[]>([]);
  const { toast } = useToast();
  const { userId } = useUserRole();

  useEffect(() => {
    loadLogs();
  }, [panelistaId]);

  const loadLogs = async () => {
    const { data, error } = await supabase
      .from('panelistas_availability_log')
      .select(`
        id,
        status,
        previous_status,
        leave_start_date,
        leave_end_date,
        reason,
        notes,
        changed_at,
        changed_by,
        usuarios:changed_by (nombre_completo)
      `)
      .eq('panelista_id', panelistaId)
      .order('changed_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setLogs(data);
    }
  };

  const handleSetLeave = async () => {
    if (!leaveStartDate || !leaveEndDate) {
      toast({
        title: "Error",
        description: "Debe especificar fecha de inicio y fin de la baja",
        variant: "destructive"
      });
      return;
    }

    if (new Date(leaveEndDate) <= new Date(leaveStartDate)) {
      toast({
        title: "Error",
        description: "La fecha de fin debe ser posterior a la fecha de inicio",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update panelista status
      const { error: updateError } = await supabase
        .from('panelistas')
        .update({
          availability_status: 'temporary_leave',
          current_leave_start: leaveStartDate,
          current_leave_end: leaveEndDate,
          last_availability_change: new Date().toISOString()
        })
        .eq('id', panelistaId);

      if (updateError) throw updateError;

      // Log the change
      const { error: logError } = await supabase
        .from('panelistas_availability_log')
        .insert({
          panelista_id: panelistaId,
          cliente_id: clienteId,
          status: 'temporary_leave',
          previous_status: currentStatus,
          leave_start_date: leaveStartDate,
          leave_end_date: leaveEndDate,
          reason: reason || null,
          notes: notes || null,
          changed_by: userId,
          changed_at: new Date().toISOString()
        });

      if (logError) throw logError;

      toast({
        title: "Baja registrada",
        description: `Panelista de baja desde ${leaveStartDate} hasta ${leaveEndDate}`
      });

      setLeaveStartDate("");
      setLeaveEndDate("");
      setReason("");
      setNotes("");
      loadLogs();
      onUpdate();

    } catch (error: any) {
      console.error('Error setting leave:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('panelistas')
        .update({
          availability_status: 'active',
          current_leave_start: null,
          current_leave_end: null,
          last_availability_change: new Date().toISOString()
        })
        .eq('id', panelistaId);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('panelistas_availability_log')
        .insert({
          panelista_id: panelistaId,
          cliente_id: clienteId,
          status: 'active',
          previous_status: currentStatus,
          leave_start_date: currentLeaveStart,
          leave_end_date: currentLeaveEnd,
          reason: 'Manual reactivation',
          changed_by: userId,
          changed_at: new Date().toISOString()
        });

      if (logError) throw logError;

      toast({
        title: "Panelista reactivado",
        description: "El panelista ha sido reactivado manualmente"
      });

      loadLogs();
      onUpdate();

    } catch (error: any) {
      console.error('Error reactivating:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success">{status === 'active' ? 'Activo' : status}</Badge>;
      case 'temporary_leave':
        return <Badge variant="secondary">Baja Temporal</Badge>;
      case 'inactive':
        return <Badge variant="destructive">Inactivo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Estado Actual de Disponibilidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Estado:</span>
              {getStatusBadge(currentStatus)}
            </div>
            
            {currentStatus === 'temporary_leave' && currentLeaveStart && currentLeaveEnd && (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Desde:</span> {currentLeaveStart}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Hasta:</span> {currentLeaveEnd}
                </div>
                <Button 
                  onClick={handleReactivate} 
                  disabled={isSubmitting}
                  variant="outline"
                  size="sm"
                >
                  Reactivar Ahora
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Register New Leave */}
      {currentStatus === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar Baja Temporal</CardTitle>
            <CardDescription>
              Configure el período de baja del panelista
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leave_start">Fecha Inicio</Label>
                <Input
                  id="leave_start"
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave_end">Fecha Fin</Label>
                <Input
                  id="leave_end"
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Vacaciones, enfermedad..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional..."
              />
            </div>
            
            <Button 
              onClick={handleSetLeave} 
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Guardando..." : "Registrar Baja"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cambios</CardTitle>
          <CardDescription>
            Últimos cambios en la disponibilidad del panelista
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin cambios registrados</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border-l-2 border-border pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(log.status)}
                    {log.previous_status && (
                      <>
                        <span className="text-xs text-muted-foreground">←</span>
                        {getStatusBadge(log.previous_status)}
                      </>
                    )}
                  </div>
                  {log.leave_start_date && log.leave_end_date && (
                    <p className="text-sm text-muted-foreground">
                      {log.leave_start_date} - {log.leave_end_date}
                    </p>
                  )}
                  {log.reason && (
                    <p className="text-sm">{log.reason}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(log.changed_at).toLocaleString('es-ES')}
                    {log.usuarios && ` • ${log.usuarios.nombre_completo}`}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}