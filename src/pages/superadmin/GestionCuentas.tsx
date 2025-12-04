import { useState, useEffect } from "react";
import { Plus, Building2, Users, Calendar, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import FormularioCrearCuenta from "@/components/superadmin/FormularioCrearCuenta";
import TablaCuentas from "@/components/superadmin/TablaCuentas";

interface Cliente {
  id: number;
  nombre: string;
  tipo_dias: string;
  idioma: string;
  max_events_per_week: number;
  estado: string;
  fecha_alta: string;
  admin_count?: number;
}

export default function GestionCuentas() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setLoading(true);

      // Cargar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("*")
        .order("fecha_alta", { ascending: false });

      if (clientesError) throw clientesError;

      // Cargar conteo de admins por cliente
      const { data: adminsData, error: adminsError } = await supabase
        .from("usuarios")
        .select("cliente_id, id")
        .in("id", 
          (await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin")
          ).data?.map(r => r.user_id) || []
        );

      if (adminsError) throw adminsError;

      // Combinar datos
      const clientesConAdmins = clientesData?.map(cliente => ({
        ...cliente,
        admin_count: adminsData?.filter(a => a.cliente_id === cliente.id).length || 0
      })) || [];

      setClientes(clientesConAdmins);
    } catch (error: any) {
      console.error("Error cargando clientes:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las cuentas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCuentaCreada = () => {
    setMostrarFormulario(false);
    cargarClientes();
    toast({
      title: "✅ Cuenta creada",
      description: "La cuenta y el usuario administrador se crearon correctamente",
    });
  };

  const handleCambiarEstado = async (clienteId: number, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from("clientes")
        .update({ estado: nuevoEstado })
        .eq("id", clienteId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `La cuenta ha sido ${nuevoEstado === 'activo' ? 'activada' : 'desactivada'}`,
      });

      cargarClientes();
    } catch (error: any) {
      console.error("Error actualizando estado:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Gestión de Cuentas
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra las cuentas de clientes y sus usuarios administradores
          </p>
        </div>
        <Button
          onClick={() => setMostrarFormulario(true)}
          size="lg"
          className="gap-2"
        >
          <Plus className="h-5 w-5" />
          Nueva Cuenta
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cuentas</p>
              <p className="text-2xl font-bold">{clientes.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Activas</p>
              <p className="text-2xl font-bold">
                {clientes.filter(c => c.estado === 'activo').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inactivas</p>
              <p className="text-2xl font-bold">
                {clientes.filter(c => c.estado === 'inactivo').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Globe className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Idiomas</p>
              <p className="text-2xl font-bold">
                {new Set(clientes.map(c => c.idioma)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de creación */}
      {mostrarFormulario && (
        <FormularioCrearCuenta
          onClose={() => setMostrarFormulario(false)}
          onSuccess={handleCuentaCreada}
        />
      )}

      {/* Tabla de cuentas */}
      <TablaCuentas
        clientes={clientes}
        loading={loading}
        onCambiarEstado={handleCambiarEstado}
        onRecargar={cargarClientes}
      />
    </div>
  );
}
