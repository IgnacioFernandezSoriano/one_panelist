import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WorkflowFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function WorkflowForm({ onSuccess, onCancel, initialData }: WorkflowFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditing = !!initialData;
  const [formData, setFormData] = useState({
    cliente_id: initialData?.cliente_id?.toString() || "",
    servicio_postal: initialData?.servicio_postal || "",
    tipo_dias: initialData?.tipo_dias || "habiles",
    dias_verificacion_recepcion: initialData?.dias_verificacion_recepcion?.toString() || "",
    dias_recordatorio: initialData?.dias_recordatorio?.toString() || "",
    dias_escalamiento: initialData?.dias_escalamiento?.toString() || "",
    dias_declarar_extravio: initialData?.dias_declarar_extravio?.toString() || "",
    dias_segunda_verificacion: initialData?.dias_segunda_verificacion?.toString() || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dataToSave = {
      cliente_id: parseInt(formData.cliente_id),
      servicio_postal: formData.servicio_postal || null,
      tipo_dias: formData.tipo_dias,
      dias_verificacion_recepcion: parseInt(formData.dias_verificacion_recepcion),
      dias_recordatorio: parseInt(formData.dias_recordatorio),
      dias_escalamiento: parseInt(formData.dias_escalamiento),
      dias_declarar_extravio: parseInt(formData.dias_declarar_extravio),
      dias_segunda_verificacion: formData.dias_segunda_verificacion ? parseInt(formData.dias_segunda_verificacion) : null,
    };

    let error;
    if (isEditing) {
      const result = await supabase
        .from("configuracion_workflows")
        .update(dataToSave)
        .eq("id", initialData.id);
      error = result.error;
    } else {
      const result = await supabase.from("configuracion_workflows").insert([dataToSave]);
      error = result.error;
    }

    if (error) {
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} workflow`,
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `Workflow ${isEditing ? "updated" : "created"} successfully` });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cliente_id">Client ID *</Label>
        <Input
          id="cliente_id"
          type="number"
          value={formData.cliente_id}
          onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="servicio_postal">Postal Service</Label>
        <Input
          id="servicio_postal"
          value={formData.servicio_postal}
          onChange={(e) => setFormData({ ...formData, servicio_postal: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo_dias">Day Type *</Label>
        <Select value={formData.tipo_dias} onValueChange={(value) => setFormData({ ...formData, tipo_dias: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="habiles">Business Days</SelectItem>
            <SelectItem value="calendario">Calendar Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dias_verificacion_recepcion">Verification Days *</Label>
          <Input
            id="dias_verificacion_recepcion"
            type="number"
            value={formData.dias_verificacion_recepcion}
            onChange={(e) => setFormData({ ...formData, dias_verificacion_recepcion: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dias_recordatorio">Reminder Days *</Label>
          <Input
            id="dias_recordatorio"
            type="number"
            value={formData.dias_recordatorio}
            onChange={(e) => setFormData({ ...formData, dias_recordatorio: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dias_escalamiento">Escalation Days *</Label>
          <Input
            id="dias_escalamiento"
            type="number"
            value={formData.dias_escalamiento}
            onChange={(e) => setFormData({ ...formData, dias_escalamiento: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dias_declarar_extravio">Loss Declaration Days *</Label>
          <Input
            id="dias_declarar_extravio"
            type="number"
            value={formData.dias_declarar_extravio}
            onChange={(e) => setFormData({ ...formData, dias_declarar_extravio: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dias_segunda_verificacion">2nd Verification Days</Label>
          <Input
            id="dias_segunda_verificacion"
            type="number"
            value={formData.dias_segunda_verificacion}
            onChange={(e) => setFormData({ ...formData, dias_segunda_verificacion: e.target.value })}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Workflow" : "Create Workflow")}
        </Button>
      </div>
    </form>
  );
}