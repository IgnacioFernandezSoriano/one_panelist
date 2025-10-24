import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  Truck
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { User } from "@supabase/supabase-js";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  useEffect(() => {
    // Auto-open config menu if on a config route
    if (location.pathname.startsWith("/configuracion/")) {
      setConfigOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const mainMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Send, label: "Allocation Plan", path: "/envios" },
    { icon: Users, label: "Panelists", path: "/panelistas" },
    { icon: AlertCircle, label: "Issues", path: "/incidencias" },
    { icon: MapPin, label: "Nodes", path: "/nodos" },
    { icon: GitBranch, label: "Topology", path: "/topology" },
  ];

  // Solution Parameters section
  const solutionParametersItems = [
    { icon: Building2, label: "Accounts", path: "/configuracion/clientes" },
    { icon: UserCog, label: "Users", path: "/configuracion/usuarios" },
    { icon: Box, label: "Products", path: "/configuracion/productos" },
    { icon: Truck, label: "Carriers", path: "/configuracion/carriers" },
    { icon: Workflow, label: "Workflows", path: "/configuracion/workflows" },
    { icon: AlertCircle, label: "Issues", path: "/configuracion/incidencias" },
  ];

  // Measurement Topology section
  const measurementTopologyItems = [
    { icon: MapPin, label: "Regions", path: "/configuracion/regiones" },
    { icon: MapPin, label: "Cities", path: "/configuracion/ciudades" },
    { icon: MapPin, label: "Nodes", path: "/configuracion/nodos" },
  ];

  // Data Import at the end
  const dataImportItem = { icon: Database, label: "Data Import", path: "/import" };

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sidebar-foreground">ONE</h1>
              <p className="text-xs text-sidebar-foreground/60">Postal Quality</p>
            </div>
          </div>
        </div>

        <nav className="px-3 space-y-1">
          {mainMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Configuration Collapsible Menu */}
          <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full gap-3 px-3 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5" />
                <span className="font-medium">Configuration</span>
              </div>
              {configOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-1">
              {/* Solution Parameters Section */}
              <div className="pl-10 pr-3 py-2">
                <p className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                  Solution Parameters
                </p>
              </div>
              {solutionParametersItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}

              {/* Separator */}
              <div className="px-10 py-2">
                <Separator className="bg-sidebar-border" />
              </div>

              {/* Measurement Topology Section */}
              <div className="pl-10 pr-3 py-2">
                <p className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                  Measurement Topology
                </p>
              </div>
              {measurementTopologyItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}

              {/* Separator */}
              <div className="px-10 py-2">
                <Separator className="bg-sidebar-border" />
              </div>

              {/* Data Import */}
              <Link
                to={dataImportItem.path}
                className={`flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg transition-colors ${
                  location.pathname === dataImportItem.path
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <dataImportItem.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{dataImportItem.label}</span>
              </Link>
            </CollapsibleContent>
          </Collapsible>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 w-64 p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium text-sidebar-foreground">{user.email}</p>
              <p className="text-xs text-sidebar-foreground/60">Administrator</p>
            </div>
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};