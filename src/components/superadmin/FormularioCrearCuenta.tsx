import { useState } from "react";
import { X, Building2, User, Mail, Lock, Globe, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface FormularioCrearCuentaProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function FormularioCrearCuenta({ onClose, onSuccess }: FormularioCrearCuentaProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Datos del cliente
  const [nombreCliente, setNombreCliente] = useState("");
  const [tipoDias, setTipoDias] = useState("naturales");
  const [idioma, setIdioma] = useState("SP");
  const [maxEventos, setMaxEventos] = useState(5);

  // Datos del usuario admin
  const [nombreAdmin, setNombreAdmin] = useState("");
  const [emailAdmin, setEmailAdmin] = useState("");
  const [passwordAdmin, setPasswordAdmin] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Crear cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from("clientes")
        .insert({
          nombre: nombreCliente,
          tipo_dias: tipoDias,
          idioma: idioma,
          max_events_per_week: maxEventos,
          estado: "activo"
        })
        .select()
        .single();

      if (clienteError) throw clienteError;

      // 2. Crear usuario en Supabase Auth usando Netlify Function
      const response = await fetch('/.netlify/functions/create-auth-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAdmin,
          password: passwordAdmin,
          nombre_completo: nombreAdmin,
          cliente_id: clienteData.id
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Rollback: eliminar cliente si falla la creación del usuario
        await supabase.from("clientes").delete().eq("id", clienteData.id);
        throw new Error(result.error || 'Failed to create authentication account');
      }

      const authData = result;

      // 3. Crear usuario en tabla usuarios
      const { error: usuarioError } = await supabase
        .from("usuarios")
        .insert({
          auth_user_id: authData.user.id,
          cliente_id: clienteData.id,
          nombre_completo: nombreAdmin,
          email: emailAdmin,
          password_hash: passwordAdmin,
          idioma_preferido: idioma.toLowerCase(),
          estado: "activo"
        });

      if (usuarioError) {
        // Rollback: eliminar cliente (auth user ya está creado, se maneja con trigger)
        await supabase.from("clientes").delete().eq("id", clienteData.id);
        throw usuarioError;
      }

      // 4. Obtener el ID del usuario recién creado
      const { data: usuarioData, error: usuarioQueryError } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (usuarioQueryError) throw usuarioQueryError;

      // 5. Asignar rol de admin
      const { error: rolError } = await supabase
        .from("user_roles")
        .insert({
          user_id: usuarioData.id,
          role: "admin"
        });

      if (rolError) {
        // Rollback completo
        await supabase.from("usuarios").delete().eq("id", usuarioData.id);
        await supabase.from("clientes").delete().eq("id", clienteData.id);
        throw rolError;
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error creando cuenta:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la cuenta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                Nueva Cuenta
              </CardTitle>
              <CardDescription>
                Crea una nueva cuenta de cliente y su usuario administrador
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Sección: Datos del Cliente */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Datos de la Cuenta</h3>
              </div>
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nombreCliente">Nombre de la Cuenta *</Label>
                  <Input
                    id="nombreCliente"
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                    placeholder="Ej: ACME Corporation"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoDias">Tipo de Días</Label>
                  <Select value={tipoDias} onValueChange={setTipoDias}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="naturales">Naturales</SelectItem>
                      <SelectItem value="laborables">Laborables</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idioma">Idioma</Label>
                  <Select value={idioma} onValueChange={setIdioma}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SP">Español</SelectItem>
                      <SelectItem value="EN">English</SelectItem>
                      <SelectItem value="FR">Français</SelectItem>
                      <SelectItem value="AR">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxEventos">Máx. Eventos por Semana</Label>
                  <Input
                    id="maxEventos"
                    type="number"
                    min="1"
                    value={maxEventos}
                    onChange={(e) => setMaxEventos(parseInt(e.target.value))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Sección: Datos del Usuario Administrador */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Usuario Administrador</h3>
              </div>
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nombreAdmin">Nombre Completo *</Label>
                  <Input
                    id="nombreAdmin"
                    value={nombreAdmin}
                    onChange={(e) => setNombreAdmin(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailAdmin">Email *</Label>
                  <Input
                    id="emailAdmin"
                    type="email"
                    value={emailAdmin}
                    onChange={(e) => setEmailAdmin(e.target.value)}
                    placeholder="admin@empresa.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordAdmin">Contraseña *</Label>
                  <Input
                    id="passwordAdmin"
                    type="password"
                    value={passwordAdmin}
                    onChange={(e) => setPasswordAdmin(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium">ℹ️ Información importante:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>El usuario tendrá rol de <strong>Administrador</strong></li>
                  <li>Podrá gestionar todos los módulos de su cuenta</li>
                  <li>Las credenciales deben ser comunicadas manualmente</li>
                </ul>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear Cuenta"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
