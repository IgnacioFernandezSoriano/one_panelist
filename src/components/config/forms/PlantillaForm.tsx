import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlantillaFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function PlantillaForm({ onSuccess, onCancel }: PlantillaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    codigo: "",
    tipo: "notificacion",
    idioma: "es",
    contenido: "",
    variables: "{}",
    estado: "activa",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const jsonVariables = JSON.parse(formData.variables);
      const { error } = await supabase.from("plantillas_mensajes").insert([{
        ...formData,
        variables: jsonVariables,
      }]);

      if (error) {
        toast({
          title: "Error creating template",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Template created successfully" });
        onSuccess();
      }
    } catch (err) {
      toast({
        title: "Invalid JSON",
        description: "Variables must be valid JSON",
        variant: "destructive",
      });
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
        <Label htmlFor="tipo">Type *</Label>
        <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="notificacion">Notification</SelectItem>
            <SelectItem value="recordatorio">Reminder</SelectItem>
            <SelectItem value="escalamiento">Escalation</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
        <Label htmlFor="contenido">Content *</Label>
        <Textarea
          id="contenido"
          value={formData.contenido}
          onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="variables">Variables (JSON)</Label>
        <Textarea
          id="variables"
          value={formData.variables}
          onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
          rows={2}
          placeholder='{"variable": "type"}'
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Template"}
        </Button>
      </div>
    </form>
  );
}