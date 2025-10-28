import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TranslationProvider } from "./hooks/useTranslation";
import { RoleGuard } from "@/components/auth/RoleGuard";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Panelistas from "./pages/Panelistas";
import Envios from "./pages/Envios";
import Incidencias from "./pages/Incidencias";
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
import NuevoEnvio from "./pages/NuevoEnvio";
import EditarEnvio from "./pages/EditarEnvio";
import MassivePanelistChange from "./pages/MassivePanelistChange";
import PanelistMaterialsPlan from "./pages/PanelistMaterialsPlan";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TranslationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/panelistas" element={<Panelistas />} />
            <Route path="/envios" element={<Envios />} />
            <Route path="/envios/nuevo" element={<NuevoEnvio />} />
            <Route path="/envios/massive-change" element={<MassivePanelistChange />} />
            <Route path="/envios/materials-plan" element={<PanelistMaterialsPlan />} />
            <Route path="/envios/:id" element={<EditarEnvio />} />
            <Route path="/incidencias" element={<Incidencias />} />
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

            {/* Admin & Super Admin Routes */}
            <Route path="/configuracion/usuarios" element={
              <RoleGuard allowedRoles={['superadmin', 'admin']}>
                <ConfigUsuarios />
              </RoleGuard>
            } />
            
            {/* Standard Config Routes */}
            <Route path="/configuracion/regiones" element={<ConfigRegiones />} />
            <Route path="/configuracion/ciudades" element={<ConfigCiudades />} />
            <Route path="/configuracion/nodos" element={<ConfigNodos />} />
            <Route path="/configuracion/productos" element={<ConfigProductos />} />
            <Route path="/configuracion/plantillas" element={<ConfigPlantillas />} />
            <Route path="/configuracion/panelistas" element={<ConfigPanelistas />} />
            <Route path="/configuracion/envios" element={<ConfigEnvios />} />
            <Route path="/configuracion/carriers" element={<ConfigCarriers />} />
            <Route path="/configuracion/workflows" element={<ConfigWorkflows />} />
            <Route path="/configuracion/incidencias" element={<ConfigIncidencias />} />
            <Route path="/configuracion/tipos-materiales" element={<ConfigTiposMateriales />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </TranslationProvider>
    </QueryClientProvider>
  );
};

export default App;
