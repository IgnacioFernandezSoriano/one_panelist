import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'superadmin' | 'admin' | 'coordinator' | 'manager';

export function useUserRole() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRoles();
  }, []);

  const loadUserRoles = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }

      // Temporary: Wait for Supabase types to sync
      // TODO: Uncomment once types are synced
      console.log("Waiting for Supabase types to sync...");
      
      // Get user info
      // const { data: usuario } = await supabase
      //   .from("usuarios")
      //   .select("id, cliente_id")
      //   .eq("email", session.user.email)
      //   .maybeSingle();

      // if (usuario) {
      //   setUserId(usuario.id);
      //   setClienteId(usuario.cliente_id);

      //   // Get user roles
      //   const { data: userRoles } = await supabase
      //     .from("user_roles")
      //     .select("role")
      //     .eq("user_id", usuario.id);

      //   if (userRoles) {
      //     setRoles(userRoles.map(r => r.role as AppRole));
      //   }
      // }
    } catch (error) {
      console.error("Error loading user roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isSuperAdmin = () => hasRole('superadmin');
  const isAdmin = () => hasRole('admin');
  const hasAnyRole = (requiredRoles: AppRole[]) => 
    requiredRoles.some(role => hasRole(role));

  return {
    roles,
    userId,
    clienteId,
    loading,
    hasRole,
    isSuperAdmin,
    isAdmin,
    hasAnyRole,
  };
}
