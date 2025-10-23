import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UsuarioFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function UsuarioForm({ onSuccess, onCancel }: UsuarioFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nombre_completo: "",
    email: "",
    password_hash: "",
    rol: "gestor" as "administrador" | "coordinador" | "gestor",
    telefono: "",
    whatsapp_telegram_cuenta: "",
    estado: "activo",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.from("usuarios").insert([formData]);

    if (error) {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "User created successfully" });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password_hash">Password *</Label>
        <Input
          id="password_hash"
          type="password"
          value={formData.password_hash}
          onChange={(e) => setFormData({ ...formData, password_hash: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rol">Role *</Label>
        <Select value={formData.rol} onValueChange={(value: "administrador" | "coordinador" | "gestor") => setFormData({ ...formData, rol: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="administrador">Admin</SelectItem>
            <SelectItem value="coordinador">Coordinator</SelectItem>
            <SelectItem value="gestor">Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefono">Phone</Label>
        <Input
          id="telefono"
          value={formData.telefono}
          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp_telegram_cuenta">WhatsApp/Telegram</Label>
        <Input
          id="whatsapp_telegram_cuenta"
          value={formData.whatsapp_telegram_cuenta}
          onChange={(e) => setFormData({ ...formData, whatsapp_telegram_cuenta: e.target.value })}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create User"}
        </Button>
      </div>
    </form>
  );
}