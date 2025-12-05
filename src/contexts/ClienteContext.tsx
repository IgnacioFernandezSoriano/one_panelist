import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface Cliente {
  id: number;
  nombre: string;
}

interface ClienteContextType {
  clienteId: number | null;
  availableClientes: Cliente[];
  setSelectedClienteId: (id: number) => void;
  loading: boolean;
}

const ClienteContext = createContext<ClienteContextType | undefined>(undefined);

export function ClienteProvider({ children }: { children: ReactNode }) {
  const { clienteId: userClienteId, isSuperAdmin } = useUserRole();
  const [availableClientes, setAvailableClientes] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Load available clientes for superadmin
  useEffect(() => {
    if (isSuperAdmin()) {
      loadAvailableClientes();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  const loadAvailableClientes = async () => {
    try {
      console.log('[ClienteContext] Loading clientes...');
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre");

      console.log('[ClienteContext] Query result:', { data, error });
      
      if (error) throw error;
      
      // Sort in frontend
      const sortedData = data?.sort((a, b) => a.nombre.localeCompare(b.nombre)) || [];
      console.log('[ClienteContext] Loaded:', sortedData.length, 'clientes');
      
      setAvailableClientes(sortedData);
      
      // Auto-select first cliente if available and none selected
      if (data && data.length > 0 && !selectedClienteId) {
        setSelectedClienteId(data[0].id);
      }
    } catch (error: any) {
      console.error("Error loading clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Use selectedClienteId for superadmin, userClienteId for regular users
  const clienteId = isSuperAdmin() ? selectedClienteId : userClienteId;

  return (
    <ClienteContext.Provider
      value={{
        clienteId,
        availableClientes,
        setSelectedClienteId,
        loading,
      }}
    >
      {children}
    </ClienteContext.Provider>
  );
}

export function useCliente() {
  const context = useContext(ClienteContext);
  if (context === undefined) {
    throw new Error("useCliente must be used within a ClienteProvider");
  }
  return context;
}
