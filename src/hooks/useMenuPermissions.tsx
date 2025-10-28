import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";

export function useMenuPermissions() {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { roles, isSuperAdmin, hasAnyRole } = useUserRole();

  useEffect(() => {
    loadPermissions();
  }, [roles]);

  const loadPermissions = async () => {
    try {
      // Superadmin and admin have access to everything
      if (isSuperAdmin() || hasAnyRole(['admin'])) {
        setPermissions({});
        setLoading(false);
        return;
      }

      // Get permissions for the user's role
      const userRole = roles[0]; // Get first role
      if (!userRole) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("menu_permissions")
        .select("menu_item, can_access")
        .eq("role", userRole);

      if (error) throw error;

      const permissionsMap: Record<string, boolean> = {};
      data?.forEach((perm) => {
        permissionsMap[perm.menu_item] = perm.can_access;
      });

      setPermissions(permissionsMap);
    } catch (error) {
      console.error("Error loading menu permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const canAccessMenuItem = (menuItem: string): boolean => {
    // Superadmin and admin can access everything
    if (isSuperAdmin() || hasAnyRole(['admin'])) {
      return true;
    }

    // Check permission for the menu item (default to true if not defined)
    return permissions[menuItem] !== false;
  };

  return {
    permissions,
    loading,
    canAccessMenuItem,
  };
}
