import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Building2, MapPin, Map, GitBranch, User, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NodoForm } from "@/components/config/forms/NodoForm";
import { PanelistaForm } from "@/components/config/forms/PanelistaForm";

interface Cliente {
  id: number;
  codigo: string;
  nombre: string;
  pais: string;
  estado: string;
}

interface Region {
  id: number;
  codigo: string;
  nombre: string;
  pais: string;
  descripcion: string | null;
  estado: string;
  cliente_id: number;
}

interface Ciudad {
  id: number;
  codigo: string;
  nombre: string;
  pais: string;
  clasificacion: string;
  volumen_poblacional: number | null;
  volumen_trafico_postal: number | null;
  estado: string;
  region_id: number;
}

interface Nodo {
  codigo: string;
  ciudad: string;
  pais: string;
  estado: string;
  panelista_id: number | null;
  ciudad_id: number | null;
  region_id: number | null;
}

interface Panelista {
  id: number;
  nombre_completo: string;
  email: string | null;
  telefono: string;
  nodo_asignado: string | null;
  estado: string;
  direccion_calle: string;
  direccion_ciudad: string;
  direccion_codigo_postal: string;
  direccion_pais: string;
  idioma: string;
  plataforma_preferida: string;
  zona_horaria: string;
  dias_comunicacion: string;
  horario_inicio: string;
  horario_fin: string;
  gestor_asignado_id: number | null;
}

export default function Topology() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [panelistas, setPanelistas] = useState<Panelista[]>([]);
  const [loading, setLoading] = useState(true);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedCiudad, setSelectedCiudad] = useState<Ciudad | null>(null);
  const [selectedNodo, setSelectedNodo] = useState<Nodo | null>(null);
  const [selectedPanelista, setSelectedPanelista] = useState<Panelista | null>(null);
  
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [regionDialogOpen, setRegionDialogOpen] = useState(false);
  const [ciudadDialogOpen, setCiudadDialogOpen] = useState(false);
  const [nodoDialogOpen, setNodoDialogOpen] = useState(false);
  const [editNodoDialogOpen, setEditNodoDialogOpen] = useState(false);
  const [panelistaDialogOpen, setPanelistaDialogOpen] = useState(false);
  const [editPanelistaDialogOpen, setEditPanelistaDialogOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientesData, regionesData, ciudadesData, nodosData, panelistasData] = await Promise.all([
        supabase.from("clientes").select("*").order("nombre"),
        supabase.from("regiones").select("*").order("nombre"),
        supabase.from("ciudades").select("*").order("nombre"),
        supabase.from("nodos").select("*").order("ciudad"),
        supabase.from("panelistas").select("*").order("nombre_completo"),
      ]);

      if (clientesData.error) throw clientesData.error;
      if (regionesData.error) throw regionesData.error;
      if (ciudadesData.error) throw ciudadesData.error;
      if (nodosData.error) throw nodosData.error;
      if (panelistasData.error) throw panelistasData.error;

      setClientes(clientesData.data || []);
      setRegiones(regionesData.data || []);
      setCiudades(ciudadesData.data || []);
      setNodos(nodosData.data || []);
      setPanelistas(panelistasData.data || []);
    } catch (error: any) {
      toast({
        title: "Error loading topology",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (key: string, level: 'cliente' | 'region' | 'ciudad') => {
    const isOpening = !openItems[key];
    
    if (!isOpening) {
      // When closing, also close all children
      const newOpenItems = { ...openItems };
      
      if (level === 'cliente') {
        // Close all regions, cities, and nodes under this client
        const clienteId = parseInt(key.split('-')[1]);
        const clientRegions = getRegionsByCliente(clienteId);
        clientRegions.forEach((region) => {
          delete newOpenItems[`region-${region.id}`];
          const regionCities = getCiudadesByRegion(region.id);
          regionCities.forEach((ciudad) => {
            delete newOpenItems[`ciudad-${ciudad.id}`];
          });
        });
      } else if (level === 'region') {
        // Close all cities under this region
        const regionId = parseInt(key.split('-')[1]);
        const regionCities = getCiudadesByRegion(regionId);
        regionCities.forEach((ciudad) => {
          delete newOpenItems[`ciudad-${ciudad.id}`];
        });
      }
      
      newOpenItems[key] = false;
      setOpenItems(newOpenItems);
    } else {
      setOpenItems((prev) => ({ ...prev, [key]: true }));
    }
  };

  const getRegionsByCliente = (clienteId: number) => {
    return regiones.filter((r) => r.cliente_id === clienteId);
  };

  const getCiudadesByRegion = (regionId: number) => {
    return ciudades.filter((c) => c.region_id === regionId);
  };

  const getNodosByCiudad = (ciudadId: number) => {
    return nodos.filter((n) => n.ciudad_id === ciudadId);
  };

  const getPanelistaById = (panelistaId: number | null) => {
    if (!panelistaId) return null;
    return panelistas.find((p) => p.id === panelistaId);
  };

  const handleViewCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setClienteDialogOpen(true);
  };

  const handleViewRegion = (region: Region) => {
    setSelectedRegion(region);
    setRegionDialogOpen(true);
  };

  const handleViewCiudad = (ciudad: Ciudad) => {
    setSelectedCiudad(ciudad);
    setCiudadDialogOpen(true);
  };

  const handleViewNodo = (nodo: Nodo) => {
    setSelectedNodo(nodo);
    setNodoDialogOpen(true);
  };

  const handleEditNodo = (nodo: Nodo) => {
    setSelectedNodo(nodo);
    setEditNodoDialogOpen(true);
  };

  const handleViewPanelista = (panelista: Panelista) => {
    setSelectedPanelista(panelista);
    setPanelistaDialogOpen(true);
  };

  const handleEditPanelista = (panelista: Panelista) => {
    setSelectedPanelista(panelista);
    setEditPanelistaDialogOpen(true);
  };

  const getEstadoBadge = (estado: string) => {
    return estado === "activo" ? (
      <Badge variant="default" className="bg-success">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">
          <p className="text-muted-foreground">Loading topology...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Measurement Topology</h1>
          <p className="text-muted-foreground">Hierarchical view of clients, regions, cities, and nodes</p>
        </div>

        <div className="space-y-4">
          {clientes.map((cliente) => (
            <Card key={cliente.id}>
              <Collapsible open={openItems[`cliente-${cliente.id}`]} onOpenChange={() => toggleItem(`cliente-${cliente.id}`, 'cliente')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-3 hover:opacity-70 transition-opacity flex-1">
                      {openItems[`cliente-${cliente.id}`] ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <Building2 className="w-6 h-6 text-primary" />
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl">{cliente.nombre}</CardTitle>
                          <Badge variant="outline" className="text-xs">Client</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ID: {cliente.id} • {cliente.codigo} • {cliente.pais}
                        </p>
                      </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                      {getEstadoBadge(cliente.estado)}
                      <Button variant="ghost" size="sm" onClick={() => handleViewCliente(cliente)}>
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="ml-8 space-y-3">
                      {getRegionsByCliente(cliente.id).map((region) => (
                        <Card key={region.id} className="bg-muted/30">
                          <Collapsible open={openItems[`region-${region.id}`]} onOpenChange={() => toggleItem(`region-${region.id}`, 'region')}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CollapsibleTrigger className="flex items-center gap-3 hover:opacity-70 transition-opacity flex-1">
                                  {openItems[`region-${region.id}`] ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <Map className="w-5 h-5 text-primary" />
                                  <div className="flex-1 text-left">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold">{region.nombre}</h3>
                                      <Badge variant="secondary" className="text-xs">Region</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      ID: {region.id} • {region.codigo} • {region.pais}
                                    </p>
                                  </div>
                                </CollapsibleTrigger>
                                <div className="flex items-center gap-2">
                                  {getEstadoBadge(region.estado)}
                                  <Button variant="ghost" size="sm" onClick={() => handleViewRegion(region)}>
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>

                            <CollapsibleContent>
                              <CardContent className="pt-0">
                                <div className="ml-8 space-y-2">
                                  {getCiudadesByRegion(region.id).map((ciudad) => (
                                    <Card key={ciudad.id} className="bg-background">
                                      <Collapsible open={openItems[`ciudad-${ciudad.id}`]} onOpenChange={() => toggleItem(`ciudad-${ciudad.id}`, 'ciudad')}>
                                        <CardHeader className="pb-3">
                                          <div className="flex items-center justify-between">
                                            <CollapsibleTrigger className="flex items-center gap-3 hover:opacity-70 transition-opacity flex-1">
                                              {openItems[`ciudad-${ciudad.id}`] ? (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                              ) : (
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                              )}
                                              <MapPin className="w-4 h-4 text-primary" />
                                              <div className="flex-1 text-left">
                                                <div className="flex items-center gap-2">
                                                  <h4 className="font-medium text-sm">{ciudad.nombre}</h4>
                                                  <Badge variant="secondary" className="text-xs">City</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                  ID: {ciudad.id} • {ciudad.codigo} • {ciudad.clasificacion}
                                                </p>
                                              </div>
                                            </CollapsibleTrigger>
                                            <div className="flex items-center gap-2">
                                              {getEstadoBadge(ciudad.estado)}
                                              <Button variant="ghost" size="sm" onClick={() => handleViewCiudad(ciudad)}>
                                                View Details
                                              </Button>
                                            </div>
                                          </div>
                                        </CardHeader>

                                        <CollapsibleContent>
                                          <CardContent className="pt-0">
                                            <div className="ml-8 space-y-2">
                                              {getNodosByCiudad(ciudad.id).map((nodo) => {
                                                const panelista = getPanelistaById(nodo.panelista_id);
                                                return (
                                                  <Card key={nodo.codigo} className="bg-muted/20">
                                                    <CardContent className="p-3">
                                                      <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1">
                                                          <GitBranch className="w-4 h-4 text-primary" />
                                                            <div className="flex-1">
                                                              <div className="flex items-center gap-2">
                                                                <p className="font-medium text-sm">{nodo.codigo}</p>
                                                                <Badge variant="outline" className="text-xs">Node</Badge>
                                                                {getEstadoBadge(nodo.estado)}
                                                              </div>
                                                              <p className="text-xs text-muted-foreground">
                                                                {nodo.ciudad}, {nodo.pais}
                                                              </p>
                                                            {panelista && (
                                                              <div className="flex items-center gap-2 mt-1">
                                                                <User className="w-3 h-3 text-muted-foreground" />
                                                                <button
                                                                  onClick={() => handleViewPanelista(panelista)}
                                                                  className="text-xs text-primary hover:underline"
                                                                >
                                                                  {panelista.nombre_completo}
                                                                </button>
                                                                <Button
                                                                  variant="ghost"
                                                                  size="icon"
                                                                  className="h-5 w-5"
                                                                  onClick={() => handleEditPanelista(panelista)}
                                                                >
                                                                  <Pencil className="w-3 h-3" />
                                                                </Button>
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                          <Button variant="ghost" size="sm" onClick={() => handleViewNodo(nodo)}>
                                                            View
                                                          </Button>
                                                          <Button variant="ghost" size="sm" onClick={() => handleEditNodo(nodo)}>
                                                            <Pencil className="w-4 h-4" />
                                                          </Button>
                                                        </div>
                                                      </div>
                                                    </CardContent>
                                                  </Card>
                                                );
                                              })}
                                            </div>
                                          </CardContent>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    </Card>
                                  ))}
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        {/* Cliente Detail Dialog */}
        <Dialog open={clienteDialogOpen} onOpenChange={setClienteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Client Details</DialogTitle>
            </DialogHeader>
            {selectedCliente && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Code</p>
                  <p className="font-medium">{selectedCliente.codigo}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedCliente.nombre}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{selectedCliente.pais}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getEstadoBadge(selectedCliente.estado)}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Region Detail Dialog */}
        <Dialog open={regionDialogOpen} onOpenChange={setRegionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Region Details</DialogTitle>
            </DialogHeader>
            {selectedRegion && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Code</p>
                  <p className="font-medium">{selectedRegion.codigo}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedRegion.nombre}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{selectedRegion.pais}</p>
                </div>
                <Separator />
                {selectedRegion.descripcion && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="font-medium">{selectedRegion.descripcion}</p>
                    </div>
                    <Separator />
                  </>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getEstadoBadge(selectedRegion.estado)}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Ciudad Detail Dialog */}
        <Dialog open={ciudadDialogOpen} onOpenChange={setCiudadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>City Details</DialogTitle>
            </DialogHeader>
            {selectedCiudad && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Code</p>
                  <p className="font-medium">{selectedCiudad.codigo}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedCiudad.nombre}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{selectedCiudad.pais}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Classification</p>
                  <p className="font-medium">{selectedCiudad.clasificacion}</p>
                </div>
                <Separator />
                {selectedCiudad.volumen_poblacional && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Population Volume</p>
                      <p className="font-medium">{selectedCiudad.volumen_poblacional.toLocaleString()}</p>
                    </div>
                    <Separator />
                  </>
                )}
                {selectedCiudad.volumen_trafico_postal && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Postal Traffic Volume</p>
                      <p className="font-medium">{selectedCiudad.volumen_trafico_postal.toLocaleString()}</p>
                    </div>
                    <Separator />
                  </>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getEstadoBadge(selectedCiudad.estado)}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Nodo Detail Dialog */}
        <Dialog open={nodoDialogOpen} onOpenChange={setNodoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Node Details</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNodoDialogOpen(false);
                    setEditNodoDialogOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </DialogTitle>
            </DialogHeader>
            {selectedNodo && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Code</p>
                  <p className="font-medium">{selectedNodo.codigo}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="font-medium">{selectedNodo.ciudad}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{selectedNodo.pais}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getEstadoBadge(selectedNodo.estado)}
                </div>
                <Separator />
                {selectedNodo.panelista_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned Panelist</p>
                    <button
                      onClick={() => {
                        const panelista = getPanelistaById(selectedNodo.panelista_id);
                        if (panelista) {
                          setNodoDialogOpen(false);
                          handleViewPanelista(panelista);
                        }
                      }}
                      className="text-primary hover:underline"
                    >
                      {getPanelistaById(selectedNodo.panelista_id)?.nombre_completo}
                    </button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Nodo Edit Dialog */}
        <Dialog open={editNodoDialogOpen} onOpenChange={setEditNodoDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Node</DialogTitle>
            </DialogHeader>
            {selectedNodo && (
              <NodoForm
                initialData={selectedNodo}
                onSuccess={() => {
                  setEditNodoDialogOpen(false);
                  setSelectedNodo(null);
                  loadData();
                  toast({
                    title: "Success",
                    description: "Node updated successfully",
                  });
                }}
                onCancel={() => setEditNodoDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Panelista Detail Dialog */}
        <Dialog open={panelistaDialogOpen} onOpenChange={setPanelistaDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Panelist Details</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPanelistaDialogOpen(false);
                    setEditPanelistaDialogOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </DialogTitle>
            </DialogHeader>
            {selectedPanelista && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedPanelista.nombre_completo}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedPanelista.email || "N/A"}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedPanelista.telefono}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">
                    {selectedPanelista.direccion_calle}, {selectedPanelista.direccion_ciudad},{" "}
                    {selectedPanelista.direccion_codigo_postal}, {selectedPanelista.direccion_pais}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Assigned Node</p>
                  <p className="font-medium">{selectedPanelista.nodo_asignado || "Not assigned"}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Language</p>
                  <p className="font-medium">{selectedPanelista.idioma}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Preferred Platform</p>
                  <p className="font-medium">{selectedPanelista.plataforma_preferida}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Time Zone</p>
                  <p className="font-medium">{selectedPanelista.zona_horaria}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Communication Days</p>
                  <p className="font-medium">{selectedPanelista.dias_comunicacion}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Schedule</p>
                  <p className="font-medium">
                    {selectedPanelista.horario_inicio} - {selectedPanelista.horario_fin}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getEstadoBadge(selectedPanelista.estado)}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Panelista Edit Dialog */}
        <Dialog open={editPanelistaDialogOpen} onOpenChange={setEditPanelistaDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Panelist</DialogTitle>
            </DialogHeader>
            {selectedPanelista && (
              <PanelistaForm
                initialData={selectedPanelista}
                onSuccess={() => {
                  setEditPanelistaDialogOpen(false);
                  setSelectedPanelista(null);
                  loadData();
                  toast({
                    title: "Success",
                    description: "Panelist updated successfully",
                  });
                }}
                onCancel={() => setEditPanelistaDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
