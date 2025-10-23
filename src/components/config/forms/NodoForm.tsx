import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NodoFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NodoForm({ onSuccess, onCancel }: NodoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    tipo: "urbano",
    ciudad: "",
    pais: "",
    estado: "activo",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.from("nodos").insert([formData]);

    if (error) {
      toast({
        title: "Error creating node",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Node created successfully" });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="codigo">Code *</Label>
        <Input
          id="codigo"
          value={formData.codigo}
          onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nombre">Name *</Label>
        <Input
          id="nombre"
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo">Type *</Label>
        <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="urbano">Urban</SelectItem>
            <SelectItem value="rural">Rural</SelectItem>
            <SelectItem value="centro_distribucion">Distribution Center</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ciudad">City *</Label>
        <Input
          id="ciudad"
          value={formData.ciudad}
          onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pais">Country *</Label>
        <Input
          id="pais"
          value={formData.pais}
          onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="estado">Status</Label>
        <Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activo">Active</SelectItem>
            <SelectItem value="inactivo">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Node"}
        </Button>
      </div>
    </form>
  );
}