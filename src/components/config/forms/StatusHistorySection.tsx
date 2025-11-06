import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Clock, User, MessageSquare, Edit2, CheckCircle, XCircle, Bell, Send, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StatusHistory {
  id: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  fecha_cambio: string;
  notas: string | null;
  usuarios?: {
    nombre_completo: string;
    email: string;
  };
}

interface StatusHistorySectionProps {
  envioId: number;
  currentStatus: string;
  onStatusChange?: () => void;
}

export function StatusHistorySection({ envioId, currentStatus, onStatusChange }: StatusHistorySectionProps) {
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
    checkPermissions();
  }, [envioId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("envios_estado_historial")
        .select(`
          *,
          usuarios:usuario_id (
            nombre_completo,
            email
          )
        `)
        .eq("envio_id", envioId)
        .order("fecha_cambio", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error("Error loading status history:", error);
      toast({
        title: "Error",
        description: "Could not load status history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("usuarios")
        .select("id")
        .eq("email", user.email)
        .single();

      if (!userData) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.id);

      if (!roles || roles.length === 0) return;

      const userRoles = roles.map(r => r.role);

      const { data: permissions } = await supabase
        .from("menu_permissions")
        .select("can_access")
        .eq("menu_item", "envios_change_status")
        .in("role", userRoles);

      setCanEdit(permissions?.some(p => p.can_access) || false);
    } catch (error) {
      console.error("Error checking permissions:", error);
    }
  };

  const handleEditStart = (entry: StatusHistory) => {
    setEditingId(entry.id);
    setEditNotes(entry.notas || "");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditNotes("");
  };

  const handleEditSave = async (entryId: number) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("envios_estado_historial")
        .update({ notas: editNotes.trim() || null })
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notes updated successfully",
      });

      setEditingId(null);
      setEditNotes("");
      loadHistory();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "NOTIFIED":
        return <Bell className="h-4 w-4" />;
      case "SENT":
        return <Send className="h-4 w-4" />;
      case "RECEIVED":
        return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "outline";
      case "NOTIFIED":
        return "secondary";
      case "SENT":
        return "default";
      case "RECEIVED":
        return "default";
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "text-yellow-600 dark:text-yellow-500";
      case "NOTIFIED":
        return "text-blue-600 dark:text-blue-500";
      case "SENT":
        return "text-purple-600 dark:text-purple-500";
      case "RECEIVED":
        return "text-green-600 dark:text-green-500";
      case "CANCELLED":
        return "text-red-600 dark:text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Status History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading history...</p>
        ) : history.length === 0 ? (
          <p className="text-muted-foreground text-sm">No status changes recorded yet</p>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex gap-4 pb-4 ${
                  index !== history.length - 1 ? "border-b" : ""
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className={`rounded-full p-2 ${getStatusColor(entry.estado_nuevo)} bg-muted`}>
                    {getStatusIcon(entry.estado_nuevo)}
                  </div>
                  {index !== history.length - 1 && (
                    <div className="w-px h-full bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.estado_anterior && (
                      <>
                        <Badge variant={getStatusBadgeVariant(entry.estado_anterior)}>
                          {entry.estado_anterior}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                      </>
                    )}
                    <Badge variant={getStatusBadgeVariant(entry.estado_nuevo)}>
                      {entry.estado_nuevo}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(entry.fecha_cambio), "dd/MM/yyyy HH:mm")}</span>
                    {entry.usuarios && (
                      <>
                        <span>•</span>
                        <User className="h-3 w-3" />
                        <span>{entry.usuarios.nombre_completo}</span>
                      </>
                    )}
                  </div>
                  {editingId === entry.id ? (
                    <div className="space-y-2 mt-2">
                      <Textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Add notes about this status change..."
                        rows={3}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditSave(entry.id)}
                          disabled={saving}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleEditCancel}
                          disabled={saving}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {entry.notas ? (
                        <div className="flex gap-2 mt-2 text-sm bg-muted p-2 rounded group relative">
                          <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <p className="text-muted-foreground flex-1">{entry.notas}</p>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleEditStart(entry)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-muted-foreground"
                          onClick={() => handleEditStart(entry)}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Add notes
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
