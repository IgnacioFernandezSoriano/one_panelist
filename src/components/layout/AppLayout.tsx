import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  Shield,
  User as UserIcon,
  FileBarChart,
  Brain,
  Wrench,
  BookOpen
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
  const [usuario, setUsuario] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [superAdminOpen, setSuperAdminOpen] = useState(false);
  const [allocationPlanOpen, setAllocationPlanOpen] = useState(false);
  const [topologyOpen, setTopologyOpen] = useState(false);
  const [panelistsOpen, setPanelistsOpen] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const { isSuperAdmin, hasAnyRole } = useUserRole();
  const { canAccessMenuItem } = useMenuPermissions();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserData = async (email: string) => {
    // Fetch usuario data
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();
    
    if (usuarioData) {
      setUsuario(usuarioData);
      
      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', usuarioData.id);
      
      if (rolesData && rolesData.length > 0) {
        // Priority order: superadmin > admin > manager > coordinator
        const rolePriority: Record<string, number> = {
          'superadmin': 4,
          'admin': 3,
          'manager': 2,
          'coordinator': 1
        };
        
        const highestRole = rolesData.reduce((highest, current) => {
          return (rolePriority[current.role] || 0) > (rolePriority[highest.role] || 0)
            ? current
            : highest;
        });
        
        setUserRole(highestRole.role);
      }
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.email!);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.email!);
      } else {
        setUsuario(null);
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/configuracion/")) {
      setConfigOpen(true);
    }
    if (location.pathname.startsWith("/envios")) {
      setAllocationPlanOpen(true);
      // Also open panelists menu if on massive-change or materials-plan pages
      if (location.pathname === "/envios/massive-change" || location.pathname === "/envios/materials-plan") {
        setPanelistsOpen(true);
      }
    }
    if (location.pathname.startsWith("/topology")) {
      setTopologyOpen(true);
    }
    if (location.pathname === "/panelistas") {
      setPanelistsOpen(true);
    }
    if (location.pathname.startsWith("/incidencias") || location.pathname.startsWith("/issues")) {
      setIssuesOpen(true);
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

  const panelistItems = [
    { icon: RefreshCw, label: "Massive Panelist Change", path: "/envios/massive-change" },
    { icon: PackageSearch, label: "Panelist Materials Plan", path: "/envios/materials-plan" },
  ];

  const allocationPlanItems = [
    { icon: Send, label: "View Plan", path: "/envios" },
        { icon: Brain, label: t('nav.intelligent_plan_generator'), path: "/envios/intelligent-plan-generator" },
    { icon: Upload, label: t('nav.import_csv_plan'), path: "/envios", action: "import-csv" },
  ];

  const issuesItems = [
    { icon: AlertCircle, label: "View Issues", path: "/incidencias" },
    { icon: UserX, label: "Nodos Descubiertos", path: "/issues/nodos-descubiertos" },
  ];

  const measurementTopologyItems = [
    { icon: MapPin, label: "Regions", path: "/configuracion/regiones" },
    { icon: MapPin, label: "Cities", path: "/configuracion/ciudades" },
    { icon: MapPin, label: "Nodes", path: "/configuracion/nodos" },
  ];

  const solutionParametersItems = [
    { icon: Truck, label: "Carriers", path: "/configuracion/carriers" },
    { icon: Package, label: t("menu.material_types"), path: "/configuracion/tipos-materiales" },
    { icon: Box, label: "Products", path: "/configuracion/productos" },
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
    { icon: Wrench, label: "Maintenance", path: "/configuracion/mantenimiento" },
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

            {/* Panelists Collapsible */}
            {canAccessMenuItem('panelistas') && (
              <SidebarMenuItem>
                <Collapsible open={panelistsOpen} onOpenChange={setPanelistsOpen}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton isActive={location.pathname === "/panelistas" || location.pathname === "/envios/massive-change" || location.pathname === "/envios/materials-plan"}>
                    <Users className="w-5 h-5" />
                    {sidebarOpen && <span>Panelists</span>}
                    {sidebarOpen && (panelistsOpen ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />)}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {/* View Panelists */}
                        <SidebarMenuItem>
                          <SidebarMenuButton 
                            asChild 
                            isActive={location.pathname === "/panelistas"} 
                            className="pl-8"
                          >
                            <Link to="/panelistas">
                              <Users className="w-4 h-4" />
                              {sidebarOpen && <span className="text-sm">View Panelists</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        
                        {/* Submenu items */}
                        {panelistItems.map((item) => {
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

            {/* Issues Collapsible */}
            {canAccessMenuItem('incidencias') && (
              <SidebarMenuItem>
                <Collapsible open={issuesOpen} onOpenChange={setIssuesOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={location.pathname.startsWith("/incidencias") || location.pathname.startsWith("/issues")}>
                      <AlertCircle className="w-5 h-5" />
                      {sidebarOpen && <span>Issues</span>}
                      {sidebarOpen && (issuesOpen ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />)}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroup>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {issuesItems.map((item) => {
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

            {/* Reporting - Not developed yet */}
            <SidebarMenuItem>
              <SidebarMenuButton 
                disabled 
                className="opacity-50 cursor-not-allowed"
              >
                <FileBarChart className="w-5 h-5" />
                {sidebarOpen && <span>Reporting</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>

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

            {/* Super Admin Menu - Only visible to superadmins (Last section) */}
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
            
            {/* Documentation Link */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/documentation"}>
                <Link to="/documentation">
                  <BookOpen className="w-5 h-5" />
                  {sidebarOpen && <span>Documentation</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* User Profile Dropdown */}
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start h-auto p-2">
              <div className="flex items-center gap-3 w-full">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={usuario?.avatar_url || undefined} />
                  <AvatarFallback>
                    {usuario?.nombre_completo?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                  </AvatarFallback>
                </Avatar>
                {sidebarOpen && (
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {usuario?.nombre_completo || user?.email}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {user?.email}
                    </p>
                    {userRole && (
                      <p className="text-xs text-sidebar-foreground/50 truncate font-medium">
                        {t(`role.${userRole}`)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{t('profile.my_account')}</p>
                {userRole && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {t(`role.${userRole}`)}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserIcon className="w-4 h-4 mr-2" />
              {t('profile.title')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              {t('menu.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

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
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
          </header>

          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};