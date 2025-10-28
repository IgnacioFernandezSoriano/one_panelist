import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  Upload
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { User } from "@supabase/supabase-js";

interface AppLayoutProps {
  children: ReactNode;
}

const AppSidebarContent = () => {
  const { open: sidebarOpen } = useSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [allocationPlanOpen, setAllocationPlanOpen] = useState(false);
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
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const mainMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Panelists", path: "/panelistas" },
    { icon: AlertCircle, label: "Issues", path: "/incidencias" },
    { icon: GitBranch, label: "Topology", path: "/topology" },
  ];

  const allocationPlanItems = [
    { icon: RefreshCw, label: "Massive Panelist Change", path: "/envios/massive-change" },
    { icon: Upload, label: "Import CSV", path: "/envios", action: "import-csv" },
  ];

  const solutionParametersItems = [
    { icon: Box, label: "Products", path: "/configuracion/productos" },
    { icon: Truck, label: "Carriers", path: "/configuracion/carriers" },
    { icon: Workflow, label: "Workflows", path: "/configuracion/workflows" },
    { icon: AlertCircle, label: "Issues", path: "/configuracion/incidencias" },
  ];

  const measurementTopologyItems = [
    { icon: MapPin, label: "Regions", path: "/configuracion/regiones" },
    { icon: MapPin, label: "Cities", path: "/configuracion/ciudades" },
    { icon: MapPin, label: "Nodes", path: "/configuracion/nodos" },
  ];

  const administrationItems = [
    { icon: Building2, label: "Accounts", path: "/configuracion/clientes" },
    { icon: UserCog, label: "Users", path: "/configuracion/usuarios" },
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
            {mainMenuItems.map((item) => {
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
        <Sidebar collapsible="icon">
          <AppSidebarContent />
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};