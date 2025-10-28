import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MenuPermission {
  id: string;
  role: string;
  menu_item: string;
  can_access: boolean;
}

const MENU_ITEMS = [
  { key: "dashboard", label: "Dashboard", description: "Main dashboard page" },
  { key: "panelistas", label: "Panelists", description: "Manage panelists" },
  { key: "envios", label: "Shipments", description: "Manage shipments and allocation plan" },
  { key: "incidencias", label: "Incidents", description: "Manage incidents" },
  { key: "nodos", label: "Nodes", description: "Manage nodes" },
  { key: "topology", label: "Topology", description: "View topology and unassigned nodes" },
  { key: "import", label: "Import Data", description: "Import data from CSV files" },
];

export default function MenuPermissions() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coordinatorPermissions, setCoordinatorPermissions] = useState<Record<string, boolean>>({});
  const [managerPermissions, setManagerPermissions] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);

      // Load permissions for both roles
      const { data, error } = await supabase
        .from("menu_permissions")
        .select("*")
        .in("role", ["coordinator", "manager"]);

      if (error) throw error;

      // Organize permissions by role
      const coordPerms: Record<string, boolean> = {};
      const mgrPerms: Record<string, boolean> = {};

      // Initialize all menu items to true by default
      MENU_ITEMS.forEach(item => {
        coordPerms[item.key] = true;
        mgrPerms[item.key] = true;
      });

      // Override with database values
      data?.forEach((perm: MenuPermission) => {
        if (perm.role === "coordinator") {
          coordPerms[perm.menu_item] = perm.can_access;
        } else if (perm.role === "manager") {
          mgrPerms[perm.menu_item] = perm.can_access;
        }
      });

      setCoordinatorPermissions(coordPerms);
      setManagerPermissions(mgrPerms);
    } catch (error: any) {
      toast({
        title: "Error loading permissions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Prepare upsert data for both roles
      const upsertData = [
        ...MENU_ITEMS.map(item => ({
          role: "coordinator" as const,
          menu_item: item.key,
          can_access: coordinatorPermissions[item.key] ?? true,
        })),
        ...MENU_ITEMS.map(item => ({
          role: "manager" as const,
          menu_item: item.key,
          can_access: managerPermissions[item.key] ?? true,
        })),
      ];

      const { error } = await supabase
        .from("menu_permissions")
        .upsert(upsertData, {
          onConflict: "role,menu_item",
        });

      if (error) throw error;

      toast({
        title: "Permissions saved successfully",
        description: "Menu permissions have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving permissions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (role: "coordinator" | "manager", menuItem: string) => {
    if (role === "coordinator") {
      setCoordinatorPermissions(prev => ({
        ...prev,
        [menuItem]: !prev[menuItem],
      }));
    } else {
      setManagerPermissions(prev => ({
        ...prev,
        [menuItem]: !prev[menuItem],
      }));
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Menu Permissions</h1>
          <p className="text-muted-foreground">
            Configure which menu items coordinators and managers can access
          </p>
        </div>

        <Tabs defaultValue="coordinator" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="coordinator">Coordinators</TabsTrigger>
            <TabsTrigger value="manager">Managers</TabsTrigger>
          </TabsList>

          <TabsContent value="coordinator" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Coordinator Menu Access</CardTitle>
                <CardDescription>
                  Control which menu items coordinators can see and access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {MENU_ITEMS.map((item) => (
                  <div key={item.key} className="flex items-center justify-between space-x-4 border-b pb-4 last:border-0">
                    <div className="flex-1">
                      <Label htmlFor={`coord-${item.key}`} className="text-base font-medium">
                        {item.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    </div>
                    <Switch
                      id={`coord-${item.key}`}
                      checked={coordinatorPermissions[item.key] ?? true}
                      onCheckedChange={() => togglePermission("coordinator", item.key)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manager" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Manager Menu Access</CardTitle>
                <CardDescription>
                  Control which menu items managers can see and access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {MENU_ITEMS.map((item) => (
                  <div key={item.key} className="flex items-center justify-between space-x-4 border-b pb-4 last:border-0">
                    <div className="flex-1">
                      <Label htmlFor={`mgr-${item.key}`} className="text-base font-medium">
                        {item.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    </div>
                    <Switch
                      id={`mgr-${item.key}`}
                      checked={managerPermissions[item.key] ?? true}
                      onCheckedChange={() => togglePermission("manager", item.key)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Permissions
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
