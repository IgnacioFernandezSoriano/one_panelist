import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TranslationProvider } from "./hooks/useTranslation";
import { AuthTranslationProvider } from "./hooks/useAuthTranslation";
import { ClienteProvider } from "./contexts/ClienteContext";
import { RoleGuard } from "@/components/auth/RoleGuard";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Panelistas from "./pages/Panelistas";
import Envios from "./pages/Envios";
import Incidencias from "./pages/Incidencias";
import EventosPendientesValidar from "./pages/EventosPendientesValidar";
import EventosReales from "./pages/EventosReales";
import NodosDescubiertos from "./pages/NodosDescubiertos";
import UnassignedEvents from "./pages/UnassignedEvents";
import PanelistVacations from "./pages/PanelistVacations";
import NodeDetail from "./pages/NodeDetail";
import Nodos from "./pages/Nodos";
import Topology from "./pages/Topology";
import UnassignedNodes from "./pages/UnassignedNodes";
import DataImport from "./pages/DataImport";
import ImportGuide from "./pages/ImportGuide";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import ConfigClientes from "./pages/config/Clientes";
import ConfigRegiones from "./pages/config/Regiones";
import ConfigCiudades from "./pages/config/Ciudades";
import ConfigNodos from "./pages/config/ConfigNodos";
import TiemposTransito from "./pages/config/TiemposTransito";
import ConfigUsuarios from "./pages/config/Usuarios";
import ConfigProductos from "./pages/config/Productos";
import ConfigPlantillas from "./pages/config/Plantillas";
import ConfigPanelistas from "./pages/config/ConfigPanelistas";
import ConfigEnvios from "./pages/config/ConfigEnvios";
import ConfigCarriers from "./pages/config/Carriers";
import ConfigWorkflows from "./pages/config/Workflows";
import ConfigIncidencias from "./pages/config/ConfigIncidencias";
import ConfigTiposMateriales from "./pages/config/TiposMateriales";
import ConfigTraducciones from "./pages/config/Traducciones";
import ConfigIdiomas from "./pages/config/Idiomas";
import MenuPermissions from "./pages/config/MenuPermissions";
import Mantenimiento from "./pages/config/Mantenimiento";
import NuevoEnvio from "./pages/NuevoEnvio";
import EditarEnvio from "./pages/EditarEnvio";
import IntelligentPlanGenerator from "./pages/IntelligentPlanGenerator";
import GeneratedAllocationPlans from "./pages/GeneratedAllocationPlans";
import ImportCSVPlan from "./pages/ImportCSVPlan";
import MassivePanelistChange from "./pages/MassivePanelistChange";
import ScheduledChanges from "./pages/ScheduledChanges";
import PanelistMaterialsPlan from "./pages/PanelistMaterialsPlan";
import RegistrarEnvioRecepcion from "./pages/RegistrarEnvioRecepcion2";
import Documentation from "./pages/Documentation";
import Profile from "./pages/Profile";
import RegulatorDashboard from "./pages/RegulatorDashboard";
import E2EMeasurement from "./pages/reporting/E2EMeasurement";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthTranslationProvider>
        <TranslationProvider>
          <ClienteProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/dashboard" element={<ExecutiveDashboard />} />
            <Route path="/dashboard-old" element={<Dashboard />} />
            <Route path="/panelistas" element={<Panelistas />} />
            <Route path="/panelistas/vacations" element={<PanelistVacations />} />
            <Route path="/envios" element={<Envios />} />
            <Route path="/envios/nuevo" element={<NuevoEnvio />} />
            <Route path="/envios/intelligent-plan-generator" element={<IntelligentPlanGenerator />} />
            <Route path="/envios/generated-allocation-plans" element={<GeneratedAllocationPlans />} />
            <Route path="/envios/import-csv-plan" element={<ImportCSVPlan />} />
            <Route path="/envios/eventos-pendientes-validar" element={<EventosPendientesValidar />} />
            <Route path="/envios/eventos-reales" element={<EventosReales />} />
            <Route path="/envios/registrar-envio-recepcion" element={<RegistrarEnvioRecepcion />} />
            <Route path="/envios/massive-change" element={<MassivePanelistChange />} />
            <Route path="/panelistas/scheduled-changes" element={<ScheduledChanges />} />
            <Route path="/envios/materials-plan" element={<PanelistMaterialsPlan />} />
            <Route path="/envios/:id" element={<EditarEnvio />} />
            <Route path="/incidencias" element={<Incidencias />} />
            <Route path="/issues/nodos-descubiertos" element={<NodosDescubiertos />} />
            <Route path="/issues/nodos-descubiertos/:nodoCodigo" element={<NodeDetail />} />
            <Route path="/issues/unassigned-events" element={<UnassignedEvents />} />
            <Route path="/nodos" element={<Nodos />} />
            <Route path="/topology" element={<Topology />} />
            <Route path="/topology/unassigned-nodes" element={<UnassignedNodes />} />
            <Route path="/import" element={<DataImport />} />
            <Route path="/import-guide" element={<ImportGuide />} />
            
            {/* Super Admin Routes */}
            <Route path="/configuracion/clientes" element={
              <RoleGuard allowedRoles={['superadmin']}>
                <ConfigClientes />
              </RoleGuard>
            } />
            <Route path="/configuracion/idiomas" element={
              <RoleGuard allowedRoles={['superadmin']}>
                <ConfigIdiomas />
              </RoleGuard>
            } />
            <Route path="/configuracion/traducciones" element={
              <RoleGuard allowedRoles={['superadmin']}>
                <ConfigTraducciones />
              </RoleGuard>
            } />
            <Route path="/configuracion/mantenimiento" element={
              <RoleGuard allowedRoles={['superadmin']}>
                <Mantenimiento />
              </RoleGuard>
            } />

            {/* Reporting Routes */}
            <Route path="/reporting/regulator" element={<RegulatorDashboard />} />
            <Route path="/reporting/e2e-measurement" element={<E2EMeasurement />} />

            {/* Admin & Super Admin Routes */}
            <Route path="/configuracion/usuarios" element={
              <RoleGuard allowedRoles={['superadmin', 'admin']}>
                <ConfigUsuarios />
              </RoleGuard>
            } />
            <Route path="/configuracion/menu-permissions" element={
              <RoleGuard allowedRoles={['superadmin', 'admin']}>
                <MenuPermissions />
              </RoleGuard>
            } />
            
            {/* Standard Config Routes - Admin & Super Admin only */}
            <Route path="/configuracion/regiones" element={
              <RoleGuard allowedRoles={['superadmin', 'admin']}>
                <ConfigRegiones />
              </RoleGuard>
            } />
            <Route path="/configuracion/ciudades" element={
              <RoleGuard allowedRoles={['superadmin', 'admin']}>
                <ConfigCiudades />
              </RoleGuard>
            } />
              <Route path="/configuracion/nodos" element={
                <RoleGuard allowedRoles={['superadmin', 'admin']}>
                  <ConfigNodos />
                </RoleGuard>
              } />
              <Route path="/configuracion/tiempos-transito" element={
                <RoleGuard allowedRoles={['superadmin', 'admin']}>
                  <TiemposTransito />
                </RoleGuard>
              } />
              <Route path="/configuracion/productos" element={
              <RoleGuard allowedRoles={['superadmin', 'admin']}>
                <ConfigProductos />
              </RoleGuard>
            } />
            <Route path="/configuracion/plantillas" element={
              <RoleGuard allowedRoles={['superadmin', 'admin']}>
                <ConfigPlantillas />
              </RoleGuard>
            } />
            <Route path="/configuracion/panelistas" element={
              <RoleGuard allowedRoles={['superadmin', 'admin']}>
                <ConfigPanelistas />
              </RoleGuard>
            } />
            <Route path="/configuracion/envios" element={
              <RoleGuard allowedRoles={['superadmin', 'admin']}>
                <ConfigEnvios />
              </RoleGuard>
            } />
            <Route path="/configuracion/carriers" element={
              <RoleGuard allowedRoles={['superadmin', 'admin']}>
                <ConfigCarriers />
              </RoleGuard>
            } />
            <Route path="/configuracion/workflows" element={
              <RoleGuard allowedRoles={['superadmin', 'admin']}>
                <ConfigWorkflows />
              </RoleGuard>
            } />
            <Route path="/configuracion/incidencias" element={
              <RoleGuard allowedRoles={['superadmin', 'admin']}>
                <ConfigIncidencias />
              </RoleGuard>
            } />
            <Route path="/configuracion/tipos-materiales" element={
              <RoleGuard allowedRoles={['superadmin', 'admin']}>
                <ConfigTiposMateriales />
              </RoleGuard>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
          </TooltipProvider>
        </ClienteProvider>
      </TranslationProvider>
      </AuthTranslationProvider>
    </QueryClientProvider>
  );
};

export default App;
