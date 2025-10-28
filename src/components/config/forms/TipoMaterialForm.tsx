import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TipoMaterialFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function TipoMaterialForm({ onSuccess, onCancel, initialData }: TipoMaterialFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    codigo: initialData?.codigo || "",
    nombre: initialData?.nombre || "",
    descripcion: initialData?.descripcion || "",
    unidad_medida: initialData?.unidad_medida || "unidad",
    estado: initialData?.estado || "activo",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        codigo: initialData.codigo || "",
        nombre: initialData.nombre || "",
        descripcion: initialData.descripcion || "",
        unidad_medida: initialData.unidad_medida || "unidad",
        estado: initialData.estado || "activo",
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const dataToSave = { ...formData };
      
      if (initialData?.id) {
        // Editing - keep existing code
        const { error } = await supabase
          .from("tipos_material")
          .update(dataToSave)
          .eq("id", initialData.id);

        if (error) throw error;

        toast({
          title: "Material type updated",
          description: "The material type has been updated successfully",
        });
      } else {
        // Creating new - generate code from name
        const generatedCode = formData.nombre
          .toUpperCase()
          .replace(/\s+/g, '-')
          .replace(/[^A-Z0-9-]/g, '')
          .substring(0, 50);
        
        dataToSave.codigo = generatedCode;

        const { error } = await supabase
          .from("tipos_material")
          .insert([dataToSave]);

        if (error) throw error;

        toast({
          title: "Material type created",
          description: "The material type has been created successfully",
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="codigo">Code</Label>
        <Input
          id="codigo"
          value={initialData?.codigo || "Auto-generated"}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Code will be auto-generated based on material name
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nombre">Name *</Label>
        <Input
          id="nombre"
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          placeholder="Tag de seguimiento"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="unidad_medida">Unit of Measure *</Label>
        <Input
          id="unidad_medida"
          value={formData.unidad_medida}
          onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
          placeholder="unidad, pack de 10, rollo"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Description</Label>
        <Textarea
          id="descripcion"
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          placeholder="Detailed description of the material"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="estado">Status *</Label>
        <Select
          value={formData.estado}
          onValueChange={(value) => setFormData({ ...formData, estado: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activo">Active</SelectItem>
            <SelectItem value="inactivo">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initialData ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
