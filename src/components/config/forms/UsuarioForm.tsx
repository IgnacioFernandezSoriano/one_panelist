import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UsuarioFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function UsuarioForm({ onSuccess, onCancel, initialData }: UsuarioFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<any[]>([]);
  const { toast } = useToast();
  const isEditing = !!initialData;
  const [formData, setFormData] = useState({
    nombre_completo: initialData?.nombre_completo || "",
    email: initialData?.email || "",
    password_hash: initialData?.password_hash || "",
    rol: (initialData?.rol || "gestor") as "administrador" | "coordinador" | "gestor",
    telefono: initialData?.telefono || "",
    whatsapp_telegram_cuenta: initialData?.whatsapp_telegram_cuenta || "",
    estado: initialData?.estado || "activo",
    idioma_preferido: initialData?.idioma_preferido || "es",
  });

  useEffect(() => {
    const loadLanguages = async () => {
      const { data, error } = await supabase
        .from('idiomas_disponibles')
        .select('*')
        .eq('activo', true)
        .order('es_default', { ascending: false });
      
      if (!error && data) {
        setAvailableLanguages(data);
      }
    };
    loadLanguages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let error;
    if (isEditing) {
      const result = await supabase
        .from("usuarios")
        .update(formData)
        .eq("id", initialData.id);
      error = result.error;
    } else {
      const result = await supabase.from("usuarios").insert([formData]);
      error = result.error;
    }

    if (error) {
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} user`,
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `User ${isEditing ? "updated" : "created"} successfully` });
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
        <Label htmlFor="telefono">Phone (International Format)</Label>
        <Input
          id="telefono"
          value={formData.telefono}
          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          placeholder="+34600123456"
          pattern="^\+[1-9]\d{1,14}$"
          title="Format: +[country code][number] (e.g., +34600123456)"
        />
        <p className="text-xs text-muted-foreground">
          Format: +[country code][number] (e.g., +34600123456, +52155123456)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp_telegram_cuenta">WhatsApp/Telegram</Label>
        <Input
          id="whatsapp_telegram_cuenta"
          value={formData.whatsapp_telegram_cuenta}
          onChange={(e) => setFormData({ ...formData, whatsapp_telegram_cuenta: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="idioma_preferido">Preferred Language *</Label>
        <Select value={formData.idioma_preferido} onValueChange={(value) => setFormData({ ...formData, idioma_preferido: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableLanguages.map((lang) => (
              <SelectItem key={lang.codigo} value={lang.codigo}>
                <span className="flex items-center gap-2">
                  <span>{lang.bandera_emoji}</span>
                  <span>{lang.nombre_nativo}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update User" : "Create User")}
        </Button>
      </div>
    </form>
  );
}