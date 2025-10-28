import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Package, 
  Users, 
  Send, 
  AlertCircle, 
  Settings, 
  LogOut,
  LayoutDashboard,
  MapPin,
  Database,
  ChevronDown,
  ChevronRight,
  Building2,
  UserCog,
  MessageSquare,
  Workflow,
  FileText,
  GitBranch,
  Box,
  Truck,
  RefreshCw,
  Upload,
  UserX,
  PackageSearch,
  Languages,
  Shield
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { User } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";

interface AppLayoutProps {
  children: ReactNode;
}

const AppSidebarContent = () => {
  const { open: sidebarOpen } = useSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [superAdminOpen, setSuperAdminOpen] = useState(false);
  const [allocationPlanOpen, setAllocationPlanOpen] = useState(false);
  const [topologyOpen, setTopologyOpen] = useState(false);
  const { isSuperAdmin, hasAnyRole } = useUserRole();
  const { canAccessMenuItem } = useMenuPermissions();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/configuracion/")) {
      setConfigOpen(true);
    }
    if (location.pathname.startsWith("/envios")) {
      setAllocationPlanOpen(true);
    }
    if (location.pathname.startsWith("/topology")) {
      setTopologyOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const mainMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  ];

  const topologyItems = [
    { icon: UserX, label: "Unassigned Nodes", path: "/topology/unassigned-nodes" },
  ];

  const allocationPlanItems = [
    { icon: Upload, label: "Import Plan", path: "/envios", action: "import-csv" },
    { icon: RefreshCw, label: "Massive Panelist Change", path: "/envios/massive-change" },
    { icon: PackageSearch, label: "Panelist Materials Plan", path: "/envios/materials-plan" },
  ];

  const measurementTopologyItems = [
    { icon: MapPin, label: "Regions", path: "/configuracion/regiones" },
    { icon: MapPin, label: "Cities", path: "/configuracion/ciudades" },
    { icon: MapPin, label: "Nodes", path: "/configuracion/nodos" },
  ];

  const solutionParametersItems = [
    { icon: Truck, label: "Carriers", path: "/configuracion/carriers" },
    { icon: Box, label: "Products", path: "/configuracion/productos" },
    { icon: Package, label: "Material Types", path: "/configuracion/tipos-materiales" },
    { icon: Workflow, label: "Workflows", path: "/configuracion/workflows" },
    { icon: AlertCircle, label: "Issues", path: "/configuracion/incidencias" },
  ];

  const administrationItems = [
    { icon: UserCog, label: "Users", path: "/configuracion/usuarios" },
    { icon: Shield, label: "Users Permissions", path: "/configuracion/menu-permissions" },
  ];

  const superAdminItems = [
    { icon: Building2, label: "Accounts", path: "/configuracion/clientes" },
    { icon: Languages, label: "Languages", path: "/configuracion/idiomas" },
    { icon: Languages, label: "Translations", path: "/configuracion/traducciones" },
  ];

  return (
    <>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-sidebar-foreground">ONE</h1>
              <p className="text-xs text-sidebar-foreground/60">Postal Quality</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {/* Dashboard - always visible but check permission for coordinator/manager */}
            {canAccessMenuItem('dashboard') && mainMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link to={item.path}>
                      <item.icon className="w-5 h-5" />
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}

            {/* Allocation Plan Collapsible */}
            {canAccessMenuItem('envios') && (
              <SidebarMenuItem>
                <Collapsible open={allocationPlanOpen} onOpenChange={setAllocationPlanOpen}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton isActive={location.pathname.startsWith("/envios")}>
                    <Send className="w-5 h-5" />
                    {sidebarOpen && <span>Allocation Plan</span>}
                    {sidebarOpen && (allocationPlanOpen ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />)}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {/* View Allocation Plan */}
                        <SidebarMenuItem>
                          <SidebarMenuButton 
                            asChild 
                            isActive={location.pathname === "/envios"} 
                            className="pl-8"
                          >
                            <Link to="/envios">
                              <Send className="w-4 h-4" />
                              {sidebarOpen && <span className="text-sm">View Plan</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        
                        {/* Submenu items */}
                        {allocationPlanItems.map((item) => {
                          const isActive = location.pathname === item.path;
                          return (
                            <SidebarMenuItem key={item.path + (item.action || '')}>
                              <SidebarMenuButton 
                                asChild={!item.action} 
                                isActive={isActive} 
                                className="pl-8"
                                onClick={item.action === 'import-csv' ? () => {
                                  // Dispatch custom event to open import dialog
                                  window.dispatchEvent(new CustomEvent('openImportDialog'));
                                } : undefined}
                              >
                                {item.action ? (
                                  <button className="w-full flex items-center gap-2">
                                    <item.icon className="w-4 h-4" />
                                    {sidebarOpen && <span className="text-sm">{item.label}</span>}
                                  </button>
                                ) : (
                                  <Link to={item.path}>
                                    <item.icon className="w-4 h-4" />
                                    {sidebarOpen && <span className="text-sm">{item.label}</span>}
                                  </Link>
                                )}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            )}

            {/* Panelists */}
            {canAccessMenuItem('panelistas') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/panelistas"}>
                  <Link to="/panelistas">
                    <Users className="w-5 h-5" />
                    {sidebarOpen && <span>Panelists</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Issues */}
            {canAccessMenuItem('incidencias') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/incidencias"}>
                  <Link to="/incidencias">
                    <AlertCircle className="w-5 h-5" />
                    {sidebarOpen && <span>Issues</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Topology Collapsible */}
            {canAccessMenuItem('topology') && (
              <SidebarMenuItem>
                <Collapsible open={topologyOpen} onOpenChange={setTopologyOpen}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton isActive={location.pathname.startsWith("/topology")}>
                    <GitBranch className="w-5 h-5" />
                    {sidebarOpen && <span>Topology</span>}
                    {sidebarOpen && (topologyOpen ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />)}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {/* View Topology */}
                        <SidebarMenuItem>
                          <SidebarMenuButton 
                            asChild 
                            isActive={location.pathname === "/topology"} 
                            className="pl-8"
                          >
                            <Link to="/topology">
                              <GitBranch className="w-4 h-4" />
                              {sidebarOpen && <span className="text-sm">View Topology</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        
                        {/* Submenu items */}
                        {topologyItems.map((item) => {
                          const isActive = location.pathname === item.path;
                          return (
                            <SidebarMenuItem key={item.path}>
                              <SidebarMenuButton 
                                asChild 
                                isActive={isActive} 
                                className="pl-8"
                              >
                                <Link to={item.path}>
                                  <item.icon className="w-4 h-4" />
                                  {sidebarOpen && <span className="text-sm">{item.label}</span>}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            )}

            {/* Nodes */}
            {canAccessMenuItem('nodos') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/nodos"}>
                  <Link to="/nodos">
                    <MapPin className="w-5 h-5" />
                    {sidebarOpen && <span>Nodes</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Data Import */}
            {canAccessMenuItem('import') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/import"}>
                  <Link to="/import">
                    <Database className="w-5 h-5" />
                    {sidebarOpen && <span>Data Import</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Super Admin Menu - Only visible to superadmins (First section) */}
            {isSuperAdmin() && (
              <SidebarMenuItem>
                <Collapsible open={superAdminOpen} onOpenChange={setSuperAdminOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={location.pathname.startsWith("/configuracion/clientes") || location.pathname.startsWith("/configuracion/idiomas") || location.pathname.startsWith("/configuracion/traducciones")}>
                      <Shield className="w-5 h-5" />
                      {sidebarOpen && <span>Super Admin</span>}
                      {sidebarOpen && (superAdminOpen ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />)}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroup>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {superAdminItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                              <SidebarMenuItem key={item.path}>
                                <SidebarMenuButton asChild isActive={isActive} className="pl-8">
                                  <Link to={item.path}>
                                    <item.icon className="w-4 h-4" />
                                    {sidebarOpen && <span className="text-sm">{item.label}</span>}
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            )}

            {/* Configuration Collapsible - Admin & Super Admin only */}
            {hasAnyRole(['superadmin', 'admin']) && (
              <SidebarMenuItem>
                <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <Settings className="w-5 h-5" />
                      {sidebarOpen && <span>Configuration</span>}
                      {sidebarOpen && (configOpen ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />)}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {/* Measurement Topology - First because it depends on Accounts */}
                    <SidebarGroup>
                      {sidebarOpen && (
                        <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                          Measurement Topology
                        </SidebarGroupLabel>
                      )}
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {measurementTopologyItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                              <SidebarMenuItem key={item.path}>
                                <SidebarMenuButton asChild isActive={isActive} className="pl-8">
                                  <Link to={item.path}>
                                    <item.icon className="w-4 h-4" />
                                    {sidebarOpen && <span className="text-sm">{item.label}</span>}
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>

                    {sidebarOpen && <Separator className="my-2" />}

                    {/* Solution Parameters - Second because it depends on Topology */}
                    <SidebarGroup>
                      {sidebarOpen && (
                        <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                          Solution Parameters
                        </SidebarGroupLabel>
                      )}
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {solutionParametersItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                              <SidebarMenuItem key={item.path}>
                                <SidebarMenuButton asChild isActive={isActive} className="pl-8">
                                  <Link to={item.path}>
                                    <item.icon className="w-4 h-4" />
                                    {sidebarOpen && <span className="text-sm">{item.label}</span>}
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>

                    {sidebarOpen && <Separator className="my-2" />}

                    {/* Administration - Last */}
                    <SidebarGroup>
                      {sidebarOpen && (
                        <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                          Administration
                        </SidebarGroupLabel>
                      )}
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {administrationItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                              <SidebarMenuItem key={item.path}>
                                <SidebarMenuButton asChild isActive={isActive} className="pl-8">
                                  <Link to={item.path}>
                                    <item.icon className="w-4 h-4" />
                                    {sidebarOpen && <span className="text-sm">{item.label}</span>}
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between">
          {sidebarOpen && (
            <div className="text-sm">
              <p className="font-medium text-sidebar-foreground">{user?.email}</p>
              <p className="text-xs text-sidebar-foreground/60">Administrator</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-sidebar-foreground hover:text-destructive"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </>
  );
};

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { currentLanguage, changeLanguage, availableLanguages } = useTranslation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon" className="w-[280px] data-[state=collapsed]:w-14">
          <AppSidebarContent />
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center justify-between border-b px-4">
            <SidebarTrigger />
            
            <div className="flex items-center gap-4">
              <Select value={currentLanguage} onValueChange={changeLanguage}>
                <SelectTrigger className="w-[140px] h-8">
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
          </header>

          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};