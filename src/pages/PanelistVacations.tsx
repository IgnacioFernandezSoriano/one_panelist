import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useCliente } from "@/contexts/ClienteContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface Vacation {
  id: number;
  panelista_id: number;
  panelista_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
}

interface Panelista {
  id: number;
  nombre_completo: string;
  nodo_asignado: string;
}

export default function PanelistVacations() {
  const { clienteId } = useCliente();
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [panelistas, setPanelistas] = useState<Panelista[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVacation, setEditingVacation] = useState<Vacation | null>(null);
  const [formData, setFormData] = useState({
    panelista_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    motivo: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (clienteId) {
      loadVacations();
      loadPanelistas();
    }
  }, [clienteId]);

  const loadVacations = async () => {
    if (!clienteId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('panelist_vacations')
        .select(`
          id,
          panelista_id,
          fecha_inicio,
          fecha_fin,
          motivo,
          panelistas!inner(nombre_completo)
        `)
        .eq('cliente_id', clienteId)
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;

      const formattedVacations: Vacation[] = (data || []).map((v: any) => ({
        id: v.id,
        panelista_id: v.panelista_id,
        panelista_nombre: v.panelistas.nombre_completo,
        fecha_inicio: v.fecha_inicio,
        fecha_fin: v.fecha_fin,
        motivo: v.motivo,
      }));

      setVacations(formattedVacations);
    } catch (error: any) {
      toast({
        title: "Error loading vacations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPanelistas = async () => {
    if (!clienteId) return;

    try {
      const { data, error } = await supabase
        .from('panelistas')
        .select('id, nombre_completo, nodo_asignado')
        .eq('cliente_id', clienteId)
        .eq('estado', 'activo')
        .order('nombre_completo');

      if (error) throw error;
      setPanelistas(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading panelists",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = (vacation?: Vacation) => {
    if (vacation) {
      setEditingVacation(vacation);
      setFormData({
        panelista_id: vacation.panelista_id.toString(),
        fecha_inicio: vacation.fecha_inicio,
        fecha_fin: vacation.fecha_fin,
        motivo: vacation.motivo || "",
      });
    } else {
      setEditingVacation(null);
      setFormData({
        panelista_id: "",
        fecha_inicio: "",
        fecha_fin: "",
        motivo: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!clienteId || !formData.panelista_id || !formData.fecha_inicio || !formData.fecha_fin) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const vacationData = {
        cliente_id: clienteId,
        panelista_id: parseInt(formData.panelista_id),
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin,
        motivo: formData.motivo || null,
      };

      if (editingVacation) {
        const { error } = await supabase
          .from('panelist_vacations')
          .update(vacationData)
          .eq('id', editingVacation.id);

        if (error) throw error;

        toast({
          title: "Vacation updated",
          description: "The vacation has been updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('panelist_vacations')
          .insert([vacationData]);

        if (error) throw error;

        toast({
          title: "Vacation created",
          description: "The vacation has been created successfully",
        });
      }

      setDialogOpen(false);
      loadVacations();
    } catch (error: any) {
      toast({
        title: "Error saving vacation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this vacation?")) return;

    try {
      const { error } = await supabase
        .from('panelist_vacations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Vacation deleted",
        description: "The vacation has been deleted successfully",
      });

      loadVacations();
    } catch (error: any) {
      toast({
        title: "Error deleting vacation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading vacations...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Panelist Vacations</h1>
            <p className="text-muted-foreground">
              Manage scheduled vacations and leaves for panelists
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                New Vacation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingVacation ? "Edit Vacation" : "New Vacation"}
                </DialogTitle>
                <DialogDescription>
                  {editingVacation
                    ? "Update the vacation details"
                    : "Schedule a new vacation for a panelist"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="panelista">Panelist</Label>
                  <Select
                    value={formData.panelista_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, panelista_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select panelist" />
                    </SelectTrigger>
                    <SelectContent>
                      {panelistas.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.nombre_completo} - {p.nodo_asignado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fecha_inicio">Start Date</Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha_inicio: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="fecha_fin">End Date</Label>
                  <Input
                    id="fecha_fin"
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha_fin: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="motivo">Reason (optional)</Label>
                  <Textarea
                    id="motivo"
                    value={formData.motivo}
                    onChange={(e) =>
                      setFormData({ ...formData, motivo: e.target.value })
                    }
                    placeholder="Vacation, sick leave, etc."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Vacations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{vacations.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                {vacations.filter((v) => {
                  const now = new Date();
                  const start = parseISO(v.fecha_inicio);
                  const end = parseISO(v.fecha_fin);
                  return now >= start && now <= end;
                }).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {vacations.filter((v) => {
                  const now = new Date();
                  const start = parseISO(v.fecha_inicio);
                  return start > now;
                }).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Vacations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Vacations</CardTitle>
            <CardDescription>
              {vacations.length} vacation{vacations.length !== 1 ? "s" : ""} registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Panelist</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No vacations registered
                    </TableCell>
                  </TableRow>
                ) : (
                  vacations.map((vacation) => {
                    const now = new Date();
                    const start = parseISO(vacation.fecha_inicio);
                    const end = parseISO(vacation.fecha_fin);
                    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const isActive = now >= start && now <= end;
                    const isUpcoming = start > now;
                    const isPast = end < now;

                    return (
                      <TableRow key={vacation.id}>
                        <TableCell className="font-medium">
                          {vacation.panelista_nombre}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {format(start, "dd MMM yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {format(end, "dd MMM yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>{duration} days</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {vacation.motivo || <span className="text-muted-foreground italic">-</span>}
                        </TableCell>
                        <TableCell>
                          {isActive && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Active
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Upcoming
                            </span>
                          )}
                          {isPast && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Past
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDialog(vacation)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(vacation.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
