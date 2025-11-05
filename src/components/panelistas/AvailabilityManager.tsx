import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, AlertCircle, Plus, X, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface AvailabilityManagerProps {
  panelistaId: number;
  clienteId: number;
  currentStatus: string;
  onUpdate: () => void;
}

interface ScheduledLeave {
  id: number;
  leave_start_date: string;
  leave_end_date: string;
  reason: string | null;
  notes: string | null;
  status: string;
  created_at: string;
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
  usuarios?: {
    nombre_completo: string;
  };
}

export function AvailabilityManager({ 
  panelistaId, 
  clienteId, 
  currentStatus,
  onUpdate 
}: AvailabilityManagerProps) {
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduledLeaves, setScheduledLeaves] = useState<ScheduledLeave[]>([]);
  const [availabilityLogs, setAvailabilityLogs] = useState<AvailabilityLog[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadScheduledLeaves();
    loadLogs();
  }, [panelistaId]);

  const loadScheduledLeaves = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_leaves')
        .select('*')
        .eq('panelista_id', panelistaId)
        .in('status', ['scheduled', 'active'])
        .order('leave_start_date', { ascending: true });

      if (error) throw error;
      setScheduledLeaves(data || []);
    } catch (error) {
      console.error('Error loading scheduled leaves:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('panelistas_availability_log')
        .select(`
          *,
          usuarios:changed_by(nombre_completo)
        `)
        .eq('panelista_id', panelistaId)
        .order('changed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAvailabilityLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const handleAddLeave = async () => {
    if (!leaveStartDate || !leaveEndDate) {
      toast({
        title: "Error",
        description: "Por favor selecciona las fechas de inicio y fin",
        variant: "destructive"
      });
      return;
    }

    const startDate = new Date(leaveStartDate);
    const endDate = new Date(leaveEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      toast({
        title: "Error",
        description: "La fecha de inicio no puede ser en el pasado",
        variant: "destructive"
      });
      return;
    }

    if (endDate < startDate) {
      toast({
        title: "Error",
        description: "La fecha de fin debe ser posterior a la fecha de inicio",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine status based on dates
      const leaveStatus = startDate <= today && endDate >= today ? 'active' : 'scheduled';
      const panelistaStatus = leaveStatus === 'active' ? 'temporary_leave' : currentStatus;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', user?.email)
        .single();

      // Insert scheduled leave
      const { error: insertError } = await supabase
        .from('scheduled_leaves')
        .insert({
          panelista_id: panelistaId,
          cliente_id: clienteId,
          leave_start_date: leaveStartDate,
          leave_end_date: leaveEndDate,
          reason: reason || null,
          notes: notes || null,
          status: leaveStatus,
          created_by: userData?.id
        });

      if (insertError) throw insertError;

      // Update panelista status if leave is active now
      if (leaveStatus === 'active') {
        const { error: updateError } = await supabase
          .from('panelistas')
          .update({
            availability_status: panelistaStatus,
            last_availability_change: new Date().toISOString()
          })
          .eq('id', panelistaId);

        if (updateError) throw updateError;

        // Log the change
        await supabase
          .from('panelistas_availability_log')
          .insert({
            panelista_id: panelistaId,
            cliente_id: clienteId,
            status: 'temporary_leave',
            previous_status: currentStatus,
            leave_start_date: leaveStartDate,
            leave_end_date: leaveEndDate,
            reason: reason || 'Baja temporal registrada',
            notes,
            changed_by: userData?.id,
            changed_at: new Date().toISOString()
          });
      }

      const formattedStartDate = format(new Date(leaveStartDate), 'dd/MM/yyyy');
      const formattedEndDate = format(new Date(leaveEndDate), 'dd/MM/yyyy');
      
      toast({
        title: "Éxito",
        description: leaveStatus === 'active' 
          ? `Baja temporal registrada del ${formattedStartDate} al ${formattedEndDate}. El panelista no estará disponible durante este período.` 
          : `Baja temporal programada del ${formattedStartDate} al ${formattedEndDate}. Se activará automáticamente en la fecha de inicio.`
      });

      // Reset form
      setLeaveStartDate("");
      setLeaveEndDate("");
      setReason("");
      setNotes("");
      setShowAddForm(false);

      // Reload data
      await loadScheduledLeaves();
      await loadLogs();
      onUpdate();
    } catch (error: any) {
      console.error('Error adding leave:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la baja temporal",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelLeave = async (leaveId: number) => {
    try {
      const { error } = await supabase
        .from('scheduled_leaves')
        .update({ status: 'cancelled' })
        .eq('id', leaveId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Baja temporal cancelada"
      });

      await loadScheduledLeaves();
    } catch (error) {
      console.error('Error cancelling leave:', error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la baja temporal",
        variant: "destructive"
      });
    }
  };

  const handleReactivate = async () => {
    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', user?.email)
        .single();

      // Cancel all active leaves
      const { error: cancelError } = await supabase
        .from('scheduled_leaves')
        .update({ status: 'cancelled' })
        .eq('panelista_id', panelistaId)
        .eq('status', 'active');

      if (cancelError) throw cancelError;

      // Update panelista status
      const { error: updateError } = await supabase
        .from('panelistas')
        .update({
          availability_status: 'active',
          last_availability_change: new Date().toISOString()
        })
        .eq('id', panelistaId);

      if (updateError) throw updateError;

      // Log the change
      await supabase
        .from('panelistas_availability_log')
        .insert({
          panelista_id: panelistaId,
          cliente_id: clienteId,
          status: 'active',
          previous_status: currentStatus,
          reason: 'Reactivación manual',
          changed_by: userData?.id,
          changed_at: new Date().toISOString()
        });

      toast({
        title: "Éxito",
        description: "Panelista reactivado correctamente"
      });

      await loadScheduledLeaves();
      await loadLogs();
      onUpdate();
    } catch (error) {
      console.error('Error reactivating:', error);
      toast({
        title: "Error",
        description: "No se pudo reactivar el panelista",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50">Programada</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Activa</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50">Completada</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50">Cancelada</Badge>;
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
            Estado Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {currentStatus === 'temporary_leave' ? (
                <>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    De Baja Temporal
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    El panelista está actualmente de baja
                  </p>
                </>
              ) : (
                <>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Activo
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    El panelista está disponible
                  </p>
                </>
              )}
            </div>
            {currentStatus === 'temporary_leave' && (
              <Button
                onClick={handleReactivate}
                disabled={isSubmitting}
                variant="outline"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Reactivar Manualmente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled & Active Leaves */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bajas Programadas y Activas</CardTitle>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Baja
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <Card className="mb-4 border-2 border-primary/20">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-date">Fecha Inicio *</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={leaveStartDate}
                        onChange={(e) => setLeaveStartDate(e.target.value)}
                        min={format(new Date(), 'yyyy-MM-dd')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">Fecha Fin *</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                        min={leaveStartDate || format(new Date(), 'yyyy-MM-dd')}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="reason">Motivo</Label>
                    <Input
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Vacaciones, enfermedad, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notas Adicionales</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Información adicional sobre la baja..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddLeave}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Registrar Baja
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddForm(false);
                        setLeaveStartDate("");
                        setLeaveEndDate("");
                        setReason("");
                        setNotes("");
                      }}
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {scheduledLeaves.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay bajas programadas o activas</p>
              </div>
            ) : (
              scheduledLeaves.map((leave) => (
                <Card key={leave.id} className="border-l-4" style={{
                  borderLeftColor: leave.status === 'active' ? 'rgb(249 115 22)' : 'rgb(59 130 246)'
                }}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(leave.status)}
                          <span className="font-medium">
                            {format(new Date(leave.leave_start_date), 'dd/MM/yyyy')} - {format(new Date(leave.leave_end_date), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        {leave.reason && (
                          <p className="text-sm text-muted-foreground">
                            <strong>Motivo:</strong> {leave.reason}
                          </p>
                        )}
                        {leave.notes && (
                          <p className="text-sm text-muted-foreground">
                            <strong>Notas:</strong> {leave.notes}
                          </p>
                        )}
                      </div>
                      {leave.status === 'scheduled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelLeave(leave.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cambios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {availabilityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay cambios registrados
              </p>
            ) : (
              availabilityLogs.map((log) => (
                <div key={log.id} className="border-l-2 border-muted pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {log.previous_status && (
                        <Badge variant="outline" className="text-xs">
                          {log.previous_status}
                        </Badge>
                      )}
                      <span className="text-xs">→</span>
                      <Badge variant="outline" className="text-xs">
                        {log.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                  {log.reason && (
                    <p className="text-sm text-muted-foreground">{log.reason}</p>
                  )}
                  {log.leave_start_date && log.leave_end_date && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.leave_start_date), 'dd/MM/yyyy')} - {format(new Date(log.leave_end_date), 'dd/MM/yyyy')}
                    </p>
                  )}
                  {log.usuarios && (
                    <p className="text-xs text-muted-foreground">
                      Por: {log.usuarios.nombre_completo}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}