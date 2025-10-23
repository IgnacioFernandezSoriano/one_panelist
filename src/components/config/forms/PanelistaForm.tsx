import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PanelistaFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function PanelistaForm({ onSuccess, onCancel, initialData }: PanelistaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditing = !!initialData;
  const [formData, setFormData] = useState({
    nombre_completo: initialData?.nombre_completo || "",
    email: initialData?.email || "",
    telefono: initialData?.telefono || "",
    direccion_calle: initialData?.direccion_calle || "",
    direccion_ciudad: initialData?.direccion_ciudad || "",
    direccion_codigo_postal: initialData?.direccion_codigo_postal || "",
    direccion_pais: initialData?.direccion_pais || "",
    nodo_asignado: initialData?.nodo_asignado || "",
    idioma: initialData?.idioma || "es",
    zona_horaria: initialData?.zona_horaria || "Europe/Madrid",
    horario_inicio: initialData?.horario_inicio || "09:00:00",
    horario_fin: initialData?.horario_fin || "18:00:00",
    plataforma_preferida: initialData?.plataforma_preferida || "whatsapp",
    gestor_asignado_id: initialData?.gestor_asignado_id?.toString() || "",
    estado: initialData?.estado || "activo",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dataToSave = {
      ...formData,
      gestor_asignado_id: formData.gestor_asignado_id ? parseInt(formData.gestor_asignado_id) : null,
    };

    let error;
    if (isEditing) {
      const result = await supabase
        .from("panelistas")
        .update(dataToSave)
        .eq("id", initialData.id);
      error = result.error;
    } else {
      const result = await supabase.from("panelistas").insert([dataToSave]);
      error = result.error;
    }

    if (error) {
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} panelist`,
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `Panelist ${isEditing ? "updated" : "created"} successfully` });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nombre_completo">Full Name *</Label>
          <Input
            id="nombre_completo"
            value={formData.nombre_completo}
            onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefono">Phone *</Label>
          <Input
            id="telefono"
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nodo_asignado">Assigned Node</Label>
          <Input
            id="nodo_asignado"
            value={formData.nodo_asignado}
            onChange={(e) => setFormData({ ...formData, nodo_asignado: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="direccion_calle">Street Address *</Label>
        <Input
          id="direccion_calle"
          value={formData.direccion_calle}
          onChange={(e) => setFormData({ ...formData, direccion_calle: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="direccion_ciudad">City *</Label>
          <Input
            id="direccion_ciudad"
            value={formData.direccion_ciudad}
            onChange={(e) => setFormData({ ...formData, direccion_ciudad: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="direccion_codigo_postal">Postal Code *</Label>
          <Input
            id="direccion_codigo_postal"
            value={formData.direccion_codigo_postal}
            onChange={(e) => setFormData({ ...formData, direccion_codigo_postal: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="direccion_pais">Country *</Label>
          <Input
            id="direccion_pais"
            value={formData.direccion_pais}
            onChange={(e) => setFormData({ ...formData, direccion_pais: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="idioma">Language *</Label>
          <Select value={formData.idioma} onValueChange={(value) => setFormData({ ...formData, idioma: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zona_horaria">Timezone *</Label>
          <Input
            id="zona_horaria"
            value={formData.zona_horaria}
            onChange={(e) => setFormData({ ...formData, zona_horaria: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="horario_inicio">Start Time *</Label>
          <Input
            id="horario_inicio"
            type="time"
            value={formData.horario_inicio}
            onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value + ":00" })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="horario_fin">End Time *</Label>
          <Input
            id="horario_fin"
            type="time"
            value={formData.horario_fin}
            onChange={(e) => setFormData({ ...formData, horario_fin: e.target.value + ":00" })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="plataforma_preferida">Preferred Platform *</Label>
          <Select value={formData.plataforma_preferida} onValueChange={(value) => setFormData({ ...formData, plataforma_preferida: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gestor_asignado_id">Assigned Manager ID</Label>
          <Input
            id="gestor_asignado_id"
            type="number"
            value={formData.gestor_asignado_id}
            onChange={(e) => setFormData({ ...formData, gestor_asignado_id: e.target.value })}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Panelist" : "Create Panelist")}
        </Button>
      </div>
    </form>
  );
}