import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, User, MapPin, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCliente } from "@/contexts/ClienteContext";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScheduledChange {
  id: number;
  nodo_codigo: string;
  panelista_current_id: number;
  panelista_new_id: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  status: string;
  motivo: string | null;
  affected_events_count: number;
  created_at: string;
  applied_at: string | null;
  reverted_at: string | null;
  current_panelist?: {
    nombre_completo: string;
  };
  new_panelist?: {
    nombre_completo: string;
  };
}

export default function ScheduledChanges() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clienteId } = useCliente();
  const [changes, setChanges] = useState<ScheduledChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedChange, setSelectedChange] = useState<ScheduledChange | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (clienteId) {
      loadScheduledChanges();
    }
  }, [clienteId, statusFilter]);

  const loadScheduledChanges = async () => {
    if (!clienteId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("scheduled_panelist_changes")
        .select(`
          *,
          current_panelist:panelistas!panelista_current_id(nombre_completo),
          new_panelist:panelistas!panelista_new_id(nombre_completo)
        `)
        .eq("cliente_id", clienteId)
        .order("fecha_inicio", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('[ScheduledChanges] Loaded changes:', data?.length);
      setChanges(data || []);
    } catch (error: any) {
      console.error('[ScheduledChanges] Error loading changes:', error);
      toast({
        title: "Error",
        description: "Could not load scheduled changes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelChange = async () => {
    if (!selectedChange) return;
    
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("scheduled_panelist_changes")
        .update({ status: "cancelled" })
        .eq("id", selectedChange.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Scheduled change cancelled successfully",
      });

      setCancelDialogOpen(false);
      setSelectedChange(null);
      loadScheduledChanges();
    } catch (error: any) {
      console.error('[ScheduledChanges] Error cancelling change:', error);
      toast({
        title: "Error",
        description: error.message || "Could not cancel scheduled change",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>;
      case "active":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          <XCircle className="w-3 h-3 mr-1" />
          Cancelled
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDaysUntilStart = (fechaInicio: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(fechaInicio);
    const diffTime = startDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredChanges = changes;

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/panelistas")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Panelists
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Scheduled Panelist Changes
              </h1>
              <p className="text-muted-foreground">
                View and manage programmed panelist reassignments
              </p>
            </div>
            <Button onClick={() => navigate("/envios/massive-change")}>
              Schedule New Change
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="mb-4 flex justify-between items-center">
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {filteredChanges.length} change(s)
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading scheduled changes...
            </div>
          ) : filteredChanges.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No scheduled changes found</p>
              <Button 
                onClick={() => navigate("/envios/massive-change")}
                className="mt-4"
                variant="outline"
              >
                Schedule Your First Change
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Node</TableHead>
                    <TableHead>Current Panelist</TableHead>
                    <TableHead>New Panelist</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChanges.map((change) => {
                    const daysUntilStart = getDaysUntilStart(change.fecha_inicio);
                    const isUpcoming = change.status === "pending" && daysUntilStart <= 7 && daysUntilStart >= 0;
                    
                    return (
                      <TableRow key={change.id} className={isUpcoming ? "bg-yellow-50/50" : ""}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(change.status)}
                            {isUpcoming && (
                              <span className="text-xs text-yellow-700">
                                Starts in {daysUntilStart} day{daysUntilStart !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{change.nodo_codigo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{change.current_panelist?.nombre_completo || `ID: ${change.panelista_current_id}`}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {change.panelista_new_id ? (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span>{change.new_panelist?.nombre_completo || `ID: ${change.panelista_new_id}`}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{format(new Date(change.fecha_inicio), "MMM d, yyyy")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{format(new Date(change.fecha_fin), "MMM d, yyyy")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{change.affected_events_count}</Badge>
                        </TableCell>
                        <TableCell>
                          {change.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedChange(change);
                                setCancelDialogOpen(true);
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                          {change.status === "active" && (
                            <span className="text-xs text-muted-foreground">
                              Applied {change.applied_at && format(new Date(change.applied_at), "MMM d")}
                            </span>
                          )}
                          {change.status === "completed" && (
                            <span className="text-xs text-muted-foreground">
                              Reverted {change.reverted_at && format(new Date(change.reverted_at), "MMM d")}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Scheduled Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this scheduled change?
              {selectedChange && (
                <div className="mt-4 bg-muted p-3 rounded-md space-y-1 text-sm">
                  <p><strong>Node:</strong> {selectedChange.nodo_codigo}</p>
                  <p><strong>Current Panelist:</strong> {selectedChange.current_panelist?.nombre_completo}</p>
                  <p><strong>New Panelist:</strong> {selectedChange.new_panelist?.nombre_completo || "Unassigned"}</p>
                  <p><strong>Period:</strong> {format(new Date(selectedChange.fecha_inicio), "MMM d")} - {format(new Date(selectedChange.fecha_fin), "MMM d, yyyy")}</p>
                  {selectedChange.motivo && <p><strong>Reason:</strong> {selectedChange.motivo}</p>}
                </div>
              )}
              <p className="mt-2">This action cannot be undone. The change will not be applied automatically.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Change</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelChange}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Cancelling..." : "Cancel Change"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
