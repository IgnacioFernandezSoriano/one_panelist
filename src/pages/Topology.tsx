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
import { ClienteForm } from "@/components/config/forms/ClienteForm";
import { RegionForm } from "@/components/config/forms/RegionForm";
import { CiudadForm } from "@/components/config/forms/CiudadForm";

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
  const [editClienteDialogOpen, setEditClienteDialogOpen] = useState(false);
  const [regionDialogOpen, setRegionDialogOpen] = useState(false);
  const [editRegionDialogOpen, setEditRegionDialogOpen] = useState(false);
  const [ciudadDialogOpen, setCiudadDialogOpen] = useState(false);
  const [editCiudadDialogOpen, setEditCiudadDialogOpen] = useState(false);
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

  const toggleItem = (key: string, level: 'cliente' | 'region' | 'ciudad', parentClienteId?: number, parentRegionId?: number) => {
    const isOpening = !openItems[key];
    const newOpenItems = { ...openItems };
    
    if (!isOpening) {
      // When closing, also close all children
      if (level === 'cliente') {
        // Close all regions, cities, and nodes under this account
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
    } else {
      // When opening, close all siblings at the same level
      if (level === 'cliente') {
        // Close all other accounts
        clientes.forEach((cliente) => {
          const clienteKey = `cliente-${cliente.id}`;
          if (clienteKey !== key) {
            delete newOpenItems[clienteKey];
            // Close all children of closed accounts
            const clientRegions = getRegionsByCliente(cliente.id);
            clientRegions.forEach((region) => {
              delete newOpenItems[`region-${region.id}`];
              const regionCities = getCiudadesByRegion(region.id);
              regionCities.forEach((ciudad) => {
                delete newOpenItems[`ciudad-${ciudad.id}`];
              });
            });
          }
        });
      } else if (level === 'region' && parentClienteId) {
        // Close all other regions of the same account
        const clientRegions = getRegionsByCliente(parentClienteId);
        clientRegions.forEach((region) => {
          const regionKey = `region-${region.id}`;
          if (regionKey !== key) {
            delete newOpenItems[regionKey];
            // Close all cities under closed regions
            const regionCities = getCiudadesByRegion(region.id);
            regionCities.forEach((ciudad) => {
              delete newOpenItems[`ciudad-${ciudad.id}`];
            });
          }
        });
      } else if (level === 'ciudad' && parentRegionId) {
        // Close all other cities of the same region
        const regionCities = getCiudadesByRegion(parentRegionId);
        regionCities.forEach((ciudad) => {
          const ciudadKey = `ciudad-${ciudad.id}`;
          if (ciudadKey !== key) {
            delete newOpenItems[ciudadKey];
          }
        });
      }
      
      // Open the selected item
      newOpenItems[key] = true;
    }
    
    setOpenItems(newOpenItems);
  };

  const openSpecificItem = (key: string, level: 'region' | 'ciudad', parentClienteId?: number, parentRegionId?: number) => {
    const newOpenItems = { ...openItems };
    
    // Close all siblings at the same level
    if (level === 'region' && parentClienteId) {
      // Close all other regions of the same account
      const clientRegions = getRegionsByCliente(parentClienteId);
      clientRegions.forEach((region) => {
        const regionKey = `region-${region.id}`;
        if (regionKey !== key) {
          delete newOpenItems[regionKey];
          // Close all cities under closed regions
          const regionCities = getCiudadesByRegion(region.id);
          regionCities.forEach((ciudad) => {
            delete newOpenItems[`ciudad-${ciudad.id}`];
          });
        }
      });
    } else if (level === 'ciudad' && parentRegionId) {
      // Close all other cities of the same region
      const regionCities = getCiudadesByRegion(parentRegionId);
      regionCities.forEach((ciudad) => {
        const ciudadKey = `ciudad-${ciudad.id}`;
        if (ciudadKey !== key) {
          delete newOpenItems[ciudadKey];
        }
      });
    }
    
    // Open the selected item
    newOpenItems[key] = true;
    setOpenItems(newOpenItems);
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

  const getPanelistaByNodo = (nodoCodigo: string) => {
    return panelistas.find((p) => p.nodo_asignado === nodoCodigo);
  };

  const handleViewCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setClienteDialogOpen(true);
  };

  const handleEditCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setEditClienteDialogOpen(true);
  };

  const handleViewRegion = (region: Region) => {
    setSelectedRegion(region);
    setRegionDialogOpen(true);
  };

  const handleEditRegion = (region: Region) => {
    setSelectedRegion(region);
    setEditRegionDialogOpen(true);
  };

  const handleViewCiudad = (ciudad: Ciudad) => {
    setSelectedCiudad(ciudad);
    setCiudadDialogOpen(true);
  };

  const handleEditCiudad = async (ciudad: Ciudad) => {
    setSelectedCiudad(ciudad);
    setEditCiudadDialogOpen(true);
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
      <Badge variant="default" className="bg-success text-white">Active</Badge>
    ) : (
      <Badge variant="destructive" className="bg-destructive text-white">Inactive</Badge>
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
          <p className="text-muted-foreground">Hierarchical view of accounts, regions, cities, and nodes</p>
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
                          <Badge variant="outline" className="text-xs">Account</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ID: {cliente.id} • {cliente.codigo} • {cliente.pais}
                        </p>
                      </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                      {getEstadoBadge(cliente.estado)}
                      <Button variant="ghost" size="sm" onClick={() => handleViewCliente(cliente)}>
                        View
                      </Button>

                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="ml-8 space-y-3">
                      {/* Quick navigation to regions */}
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                          Regions ({getRegionsByCliente(cliente.id).length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {getRegionsByCliente(cliente.id).map((region) => (
                            <button
                              key={region.id}
                              onClick={() => openSpecificItem(`region-${region.id}`, 'region', cliente.id)}
                              className="text-xs px-2 py-1 rounded bg-background hover:bg-primary/10 border border-border transition-colors"
                            >
                              {region.nombre}
                            </button>
                          ))}
                        </div>
                      </div>

                      {getRegionsByCliente(cliente.id).map((region) => (
                        <Card key={region.id} className="bg-muted/30">
                          <Collapsible open={openItems[`region-${region.id}`]} onOpenChange={() => toggleItem(`region-${region.id}`, 'region', cliente.id)}>
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
                                    View
                                  </Button>

                                </div>
                              </div>
                            </CardHeader>

                            <CollapsibleContent>
                              <CardContent className="pt-0">
                                <div className="ml-8 space-y-2">
                                  {/* Quick navigation to cities */}
                                  <div className="mb-3 p-2 bg-muted/30 rounded">
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                                      Cities ({getCiudadesByRegion(region.id).length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {getCiudadesByRegion(region.id).map((ciudad) => (
                                        <button
                                          key={ciudad.id}
                                          onClick={() => openSpecificItem(`ciudad-${ciudad.id}`, 'ciudad', undefined, region.id)}
                                          className="text-xs px-2 py-1 rounded bg-background hover:bg-primary/10 border border-border transition-colors"
                                        >
                                          {ciudad.nombre}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {getCiudadesByRegion(region.id).map((ciudad) => (
                                    <Card key={ciudad.id} className="bg-background">
                                      <Collapsible open={openItems[`ciudad-${ciudad.id}`]} onOpenChange={() => toggleItem(`ciudad-${ciudad.id}`, 'ciudad', undefined, region.id)}>
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
                                                View
                                              </Button>

                                            </div>
                                          </div>
                                        </CardHeader>

                                        <CollapsibleContent>
                                          <CardContent className="pt-0">
                                            <div className="ml-8 space-y-2">
                                              {/* Quick navigation to nodes */}
                                              <div className="mb-2 p-2 bg-muted/20 rounded">
                                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                                                  Nodes ({getNodosByCiudad(ciudad.id).length})
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                  {getNodosByCiudad(ciudad.id).map((nodo) => (
                                                    <span
                                                      key={nodo.codigo}
                                                      className="text-xs px-2 py-1 rounded bg-background border border-border"
                                                    >
                                                      {nodo.codigo}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>

                                              {getNodosByCiudad(ciudad.id).map((nodo) => {
                                                const panelista = getPanelistaByNodo(nodo.codigo);
                                                return (
                                                  <Card key={nodo.codigo} className="bg-muted/20">
                                                    <CardContent className="p-3">
                                                      <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1">
                                                          <GitBranch className="w-4 h-4 text-primary" />
                                                            <div className="flex-1">
                                                              <div className="flex items-center gap-2">
                                                                <button
                                                                  onClick={() => handleViewNodo(nodo)}
                                                                  className="font-medium text-sm text-primary hover:underline cursor-pointer"
                                                                >
                                                                  {nodo.codigo}
                                                                </button>
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
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                          <Button variant="ghost" size="sm" onClick={() => handleViewNodo(nodo)}>
                                                            View
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
              <DialogTitle className="flex items-center justify-between">
                <span>Account Details</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setClienteDialogOpen(false);
                    setEditClienteDialogOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </DialogTitle>
            </DialogHeader>
            {selectedCliente && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-medium">{selectedCliente.id}</p>
                </div>
                <Separator />
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

        {/* Cliente Edit Dialog */}
        <Dialog open={editClienteDialogOpen} onOpenChange={setEditClienteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
            </DialogHeader>
            {selectedCliente && (
              <ClienteForm
                initialData={selectedCliente}
                onSuccess={() => {
                  setEditClienteDialogOpen(false);
                  setSelectedCliente(null);
                  loadData();
                  toast({
                    title: "Success",
                    description: "Account updated successfully",
                  });
                }}
                onCancel={() => setEditClienteDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Region Detail Dialog */}
        <Dialog open={regionDialogOpen} onOpenChange={setRegionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Region Details</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRegionDialogOpen(false);
                    setEditRegionDialogOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </DialogTitle>
            </DialogHeader>
            {selectedRegion && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-medium">{selectedRegion.id}</p>
                </div>
                <Separator />
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

        {/* Region Edit Dialog */}
        <Dialog open={editRegionDialogOpen} onOpenChange={setEditRegionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Region</DialogTitle>
            </DialogHeader>
            {selectedRegion && (
              <RegionForm
                initialData={selectedRegion}
                onSuccess={() => {
                  setEditRegionDialogOpen(false);
                  setSelectedRegion(null);
                  loadData();
                  toast({
                    title: "Success",
                    description: "Region updated successfully",
                  });
                }}
                onCancel={() => setEditRegionDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Ciudad Detail Dialog */}
        <Dialog open={ciudadDialogOpen} onOpenChange={setCiudadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>City Details</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCiudadDialogOpen(false);
                    setEditCiudadDialogOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </DialogTitle>
            </DialogHeader>
            {selectedCiudad && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-medium">{selectedCiudad.id}</p>
                </div>
                <Separator />
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

        {/* Ciudad Edit Dialog */}
        <Dialog open={editCiudadDialogOpen} onOpenChange={setEditCiudadDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit City</DialogTitle>
            </DialogHeader>
            {selectedCiudad && (
              <CiudadForm
                initialData={selectedCiudad}
                onSuccess={async () => {
                  // Update cascading data in nodos when ciudad name or country changes
                  const oldCiudad = selectedCiudad;
                  await loadData(); // Reload to get updated ciudad data
                  
                  // Get the updated ciudad data
                  const { data: updatedCiudad } = await supabase
                    .from("ciudades")
                    .select("*")
                    .eq("id", oldCiudad.id)
                    .single();

                  if (updatedCiudad && (updatedCiudad.nombre !== oldCiudad.nombre || updatedCiudad.pais !== oldCiudad.pais)) {
                    // Update all nodos that reference this ciudad
                    const { error } = await supabase
                      .from("nodos")
                      .update({
                        ciudad: updatedCiudad.nombre,
                        pais: updatedCiudad.pais
                      })
                      .eq("ciudad_id", updatedCiudad.id);

                    if (error) {
                      toast({
                        title: "Warning",
                        description: "City updated but nodes synchronization failed: " + error.message,
                        variant: "destructive",
                      });
                    }
                  }

                  setEditCiudadDialogOpen(false);
                  setSelectedCiudad(null);
                  await loadData(); // Reload again to show updated nodes
                  toast({
                    title: "Success",
                    description: "City and related nodes updated successfully",
                  });
                }}
                onCancel={() => setEditCiudadDialogOpen(false)}
              />
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
