import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";

interface UsuarioFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function UsuarioForm({ onSuccess, onCancel, initialData }: UsuarioFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const { toast } = useToast();
  const { clienteId: currentUserClienteId, isSuperAdmin } = useUserRole();
  const isEditing = !!initialData;
  
  const [formData, setFormData] = useState({
    nombre_completo: initialData?.nombre_completo || "",
    email: initialData?.email || "",
    password_hash: "",
    cliente_id: initialData?.cliente_id || currentUserClienteId || null,
    telefono: initialData?.telefono || "",
    whatsapp_telegram_cuenta: initialData?.whatsapp_telegram_cuenta || "",
    estado: initialData?.estado || "activo",
    idioma_preferido: initialData?.idioma_preferido || "es",
  });
  
  const [selectedRole, setSelectedRole] = useState<AppRole>(
    (initialData?.roles?.[0] as AppRole) || "manager"
  );

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
    
    const loadClientes = async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('estado', 'activo')
        .order('nombre', { ascending: true });
      
      if (!error && data) {
        setClientes(data);
      }
    };
    
    const loadUserRole = async () => {
      if (isEditing && initialData?.id) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', initialData.id)
          .limit(1)
          .maybeSingle();
        
        if (data) {
          setSelectedRole(data.role as AppRole);
        }
      }
    };
    
    loadLanguages();
    loadClientes();
    loadUserRole();
  }, [isEditing, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create or update user
      let userId = initialData?.id;
      
      const userData = {
        nombre_completo: formData.nombre_completo,
        email: formData.email,
        cliente_id: formData.cliente_id,
        telefono: formData.telefono,
        whatsapp_telegram_cuenta: formData.whatsapp_telegram_cuenta,
        estado: formData.estado,
        idioma_preferido: formData.idioma_preferido,
        ...(formData.password_hash && { password_hash: formData.password_hash }),
      };

      if (isEditing) {
        const { error } = await supabase
          .from("usuarios")
          .update(userData)
          .eq("id", userId);
        
        if (error) throw error;
      } else {
        if (!formData.password_hash) {
          toast({
            title: "Error",
            description: "Password is required for new users",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        const { data, error } = await supabase
          .from("usuarios")
          .insert([{ ...userData, password_hash: formData.password_hash }])
          .select()
          .single();
        
        if (error) throw error;
        userId = data.id;
      }

      // Update role
      if (userId) {
        // Delete existing roles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);
        
        // Insert new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: selectedRole });
        
        if (roleError) throw roleError;
      }

      toast({ 
        title: `User ${isEditing ? "updated" : "created"} successfully` 
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} user`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
        <Label htmlFor="password_hash">Password {!isEditing && "*"}</Label>
        <Input
          id="password_hash"
          type="password"
          value={formData.password_hash}
          onChange={(e) => setFormData({ ...formData, password_hash: e.target.value })}
          required={!isEditing}
          placeholder={isEditing ? "Leave blank to keep current password" : ""}
        />
      </div>

      {isSuperAdmin() && (
        <div className="space-y-2">
          <Label htmlFor="cliente_id">Client *</Label>
          <Select 
            value={formData.cliente_id?.toString() || ""} 
            onValueChange={(value) => setFormData({ ...formData, cliente_id: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id.toString()}>
                  {cliente.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="role">Role *</Label>
        <Select value={selectedRole} onValueChange={(value: AppRole) => setSelectedRole(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {isSuperAdmin() && (
              <>
                <SelectItem value="superadmin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </>
            )}
            <SelectItem value="coordinator">Coordinator</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
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