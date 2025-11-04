import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RefreshCw, Edit, Trash2, Clock, Loader2 } from "lucide-react";
import TransitTimeForm from "@/components/config/forms/TransitTimeForm";

interface TransitTime {
  id: number;
  cliente_id: number;
  ciudad_origen_id: number;
  ciudad_destino_id: number;
  dias_transito: number;
  carrier_id?: number | null;
  producto_id?: number | null;
  target_percentage?: number;
  carrier?: {
    carrier_code: string;
    legal_name: string;
  };
  producto?: {
    codigo_producto: string;
    nombre_producto: string;
  };
  ciudad_origen?: {
    id: number;
    codigo: string;
    nombre: string;
    clasificacion: string;
    region?: { nombre: string };
  };
  ciudad_destino?: {
    id: number;
    codigo: string;
    nombre: string;
    clasificacion: string;
    region?: { nombre: string };
  };
}

interface Region {
  id: number;
  nombre: string;
}

export default function TiemposTransito() {
  const { clienteId } = useUserRole();
  const { toast } = useToast();
  const [transitTimes, setTransitTimes] = useState<TransitTime[]>([]);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOrigenRegion, setFilterOrigenRegion] = useState<string>("all");
  const [filterDestinoRegion, setFilterDestinoRegion] = useState<string>("all");
  const [filterOrigenClassification, setFilterOrigenClassification] = useState<string>("all");
  const [filterDestinoClassification, setFilterDestinoClassification] = useState<string>("all");
  const [massEditDialogOpen, setMassEditDialogOpen] = useState(false);
  const [massEditDays, setMassEditDays] = useState<number>(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);
  const [massDeleteDialogOpen, setMassDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (clienteId) {
      loadData();
      loadRegiones();
    }
  }, [clienteId]);

  const loadData = async () => {
    if (!clienteId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ciudad_transit_times")
        .select(`
          *,
          ciudad_origen:ciudades!ciudad_origen_id(id, codigo, nombre, clasificacion, region:regiones(nombre)),
          ciudad_destino:ciudades!ciudad_destino_id(id, codigo, nombre, clasificacion, region:regiones(nombre))
        `)
        .eq("cliente_id", clienteId)
        .order("ciudad_origen_id", { ascending: true }) as unknown as {
          data: Array<{
            id: number;
            cliente_id: number;
            ciudad_origen_id: number;
            ciudad_destino_id: number;
            dias_transito: number;
            carrier_id: number | null;
            producto_id: number | null;
            target_percentage: number;
            created_at: string;
            updated_at: string;
            ciudad_origen: { 
              id: number; 
              codigo: string; 
              nombre: string; 
              clasificacion: string; 
              region: { nombre: string } 
            };
            ciudad_destino: { 
              id: number; 
              codigo: string; 
              nombre: string; 
              clasificacion: string; 
              region: { nombre: string } 
            };
          }> | null;
          error: any;
        };

      if (error) throw error;
      
      // Load carriers and products separately for now
      const transitTimesWithRelations = await Promise.all(
        (data || []).map(async (tt: any) => {
          const result: any = { ...tt };
          
          if (tt.carrier_id) {
            const { data: carrier } = await supabase
              .from("carriers")
              .select("carrier_code, legal_name")
              .eq("id", tt.carrier_id)
              .single();
            result.carrier = carrier;
          }
          
          if (tt.producto_id) {
            const { data: producto } = await supabase
              .from("productos_cliente")
              .select("codigo_producto, nombre_producto")
              .eq("id", tt.producto_id)
              .single();
            result.producto = producto;
          }
          
          return result;
        })
      );
      
      setTransitTimes(transitTimesWithRelations as TransitTime[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRegiones = async () => {
    if (!clienteId) return;
    
    try {
      const { data, error } = await supabase
        .from("regiones")
        .select("id, nombre")
        .eq("cliente_id", clienteId)
        .eq("estado", "activo")
        .order("nombre");

      if (error) throw error;
      setRegiones(data || []);
    } catch (error: any) {
      console.error("Error loading regiones:", error);
    }
  };

  const generateAllCombinations = async () => {
    if (!clienteId) return;
    
    setGenerating(true);
    try {
      // Get all active cities
      const { data: ciudades, error: fetchError } = await supabase
        .from("ciudades")
        .select("id")
        .eq("cliente_id", clienteId)
        .eq("estado", "activo");

      if (fetchError) throw fetchError;
      if (!ciudades || ciudades.length === 0) {
        toast({
          title: "No cities found",
          description: "Please create active cities first.",
          variant: "destructive",
        });
        return;
      }

      // Get all active carriers
      const { data: carriers, error: carriersError } = await supabase
        .from("carriers")
        .select("id")
        .eq("cliente_id", clienteId)
        .eq("status", "active");

      if (carriersError) throw carriersError;

      // Get all active products
      const { data: productos, error: productosError } = await supabase
        .from("productos_cliente")
        .select("id")
        .eq("cliente_id", clienteId)
        .eq("estado", "activo");

      if (productosError) throw productosError;

      const combinations = [];
      
      // Generate combinations for each origin-destination pair
      for (let i = 0; i < ciudades.length; i++) {
        for (let j = 0; j < ciudades.length; j++) {
          if (i !== j) {
            const baseCombo = {
              cliente_id: clienteId,
              ciudad_origen_id: ciudades[i].id,
              ciudad_destino_id: ciudades[j].id,
              dias_transito: 0,
              target_percentage: 90,
            };

            // 1. General combination (no carrier, no product)
            combinations.push({
              ...baseCombo,
              carrier_id: null,
              producto_id: null,
            });

            // 2. Combinations for each carrier (no product)
            if (carriers && carriers.length > 0) {
              for (const carrier of carriers) {
                combinations.push({
                  ...baseCombo,
                  carrier_id: carrier.id,
                  producto_id: null,
                });
              }
            }

            // 3. Combinations for each product (no carrier)
            if (productos && productos.length > 0) {
              for (const producto of productos) {
                combinations.push({
                  ...baseCombo,
                  carrier_id: null,
                  producto_id: producto.id,
                });
              }
            }

            // 4. Combinations for each carrier+product pair
            if (carriers && productos && carriers.length > 0 && productos.length > 0) {
              for (const carrier of carriers) {
                for (const producto of productos) {
                  combinations.push({
                    ...baseCombo,
                    carrier_id: carrier.id,
                    producto_id: producto.id,
                  });
                }
              }
            }
          }
        }
      }

      // Fetch existing records to filter out duplicates
      const { data: existingRecords } = await supabase
        .from("ciudad_transit_times")
        .select("ciudad_origen_id, ciudad_destino_id, carrier_id, producto_id")
        .eq("cliente_id", clienteId) as { 
          data: Array<{
            ciudad_origen_id: number;
            ciudad_destino_id: number;
            carrier_id: number | null;
            producto_id: number | null;
          }> | null 
        };

      // Create a Set of existing combination keys
      const existingSet = new Set(
        existingRecords?.map(r => 
          `${r.ciudad_origen_id}-${r.ciudad_destino_id}-${r.carrier_id || 'null'}-${r.producto_id || 'null'}`
        ) || []
      );

      // Filter only new combinations
      const newCombinations = combinations.filter(combo => {
        const key = `${combo.ciudad_origen_id}-${combo.ciudad_destino_id}-${combo.carrier_id || 'null'}-${combo.producto_id || 'null'}`;
        return !existingSet.has(key);
      });

      if (newCombinations.length === 0) {
        toast({
          title: "No changes",
          description: "All combinations already exist in the database",
        });
        return;
      }

      // Insert new combinations in batches to avoid timeout
      const batchSize = 500;
      let inserted = 0;
      
      for (let i = 0; i < newCombinations.length; i += batchSize) {
        const batch = newCombinations.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from("ciudad_transit_times")
          .insert(batch);

        if (insertError) throw insertError;
        inserted += batch.length;
      }

      const cityCombos = ciudades.length * (ciudades.length - 1);
      const carriersCount = carriers?.length || 0;
      const productosCount = productos?.length || 0;
      const totalPerRoute = 1 + carriersCount + productosCount + (carriersCount * productosCount);

      toast({
        title: "Success",
        description: `Inserted ${newCombinations.length} new combinations (${combinations.length - newCombinations.length} already existed):\n` +
          `- ${cityCombos} general routes\n` +
          `- ${cityCombos * carriersCount} carrier-specific routes\n` +
          `- ${cityCombos * productosCount} product-specific routes\n` +
          `- ${cityCombos * carriersCount * productosCount} carrier+product routes`,
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
      setConfirmGenerateOpen(false);
    }
  };

  const handleMassUpdate = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      const { error } = await supabase
        .from("ciudad_transit_times")
        .update({ dias_transito: massEditDays })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedIds.size} transit times`,
      });

      setMassEditDialogOpen(false);
      setSelectedIds(new Set());
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    try {
      const { error } = await supabase
        .from("ciudad_transit_times")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transit time deleted successfully",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const handleMassDelete = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      const { error } = await supabase
        .from("ciudad_transit_times")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${selectedIds.size} transit times`,
      });

      setMassDeleteDialogOpen(false);
      setSelectedIds(new Set());
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransitTimes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransitTimes.map(tt => tt.id)));
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterOrigenRegion("all");
    setFilterDestinoRegion("all");
    setFilterOrigenClassification("all");
    setFilterDestinoClassification("all");
  };

  const filteredTransitTimes = transitTimes.filter(tt => {
    const matchesSearch = searchTerm === "" || 
      tt.ciudad_origen?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tt.ciudad_origen?.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tt.ciudad_destino?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tt.ciudad_destino?.codigo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOrigenRegion = filterOrigenRegion === "all" ||
      tt.ciudad_origen?.region?.nombre === filterOrigenRegion;

    const matchesDestinoRegion = filterDestinoRegion === "all" ||
      tt.ciudad_destino?.region?.nombre === filterDestinoRegion;

    const matchesOrigenClassification = filterOrigenClassification === "all" ||
      tt.ciudad_origen?.clasificacion === filterOrigenClassification;

    const matchesDestinoClassification = filterDestinoClassification === "all" ||
      tt.ciudad_destino?.clasificacion === filterDestinoClassification;

    return matchesSearch && matchesOrigenRegion && matchesDestinoRegion && 
           matchesOrigenClassification && matchesDestinoClassification;
  });

  const getClassificationBadgeVariant = (classification: string) => {
    switch (classification) {
      case "A": return "default";
      case "B": return "secondary";
      case "C": return "outline";
      default: return "outline";
    }
  };

  const configuredCount = transitTimes.filter(tt => tt.dias_transito > 0).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/configuracion">Configuration</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/configuracion">Measurement Topology</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Transit Times</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div>
          <h1 className="text-3xl font-bold">Standard Transit Times Between Cities</h1>
          <p className="text-muted-foreground mt-2">
            Configure expected transit days between city pairs. {configuredCount} of {transitTimes.length} combinations configured.
          </p>
        </div>

        <div className="flex gap-4">
          <Button 
            onClick={() => setConfirmGenerateOpen(true)}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Generate All Combinations
              </>
            )}
          </Button>

          <Button 
            onClick={() => {
              setEditingId(undefined);
              setEditDialogOpen(true);
            }}
            variant="outline"
          >
            <Clock className="h-4 w-4" />
            Add Manual Entry
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap items-center">
            <Input
              placeholder="Search cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />

            <Button 
              variant="outline" 
              onClick={clearFilters}
              disabled={!searchTerm && filterOrigenRegion === "all" && filterDestinoRegion === "all" && 
                        filterOrigenClassification === "all" && filterDestinoClassification === "all"}
            >
              Clear All Filters
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Origin Filters</h3>
              <div className="flex gap-2">
                <Select value={filterOrigenRegion} onValueChange={setFilterOrigenRegion}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Origin region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regiones.map((region) => (
                      <SelectItem key={region.id} value={region.nombre}>
                        {region.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterOrigenClassification} onValueChange={setFilterOrigenClassification}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Origin class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="A">Class A</SelectItem>
                    <SelectItem value="B">Class B</SelectItem>
                    <SelectItem value="C">Class C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Destination Filters</h3>
              <div className="flex gap-2">
                <Select value={filterDestinoRegion} onValueChange={setFilterDestinoRegion}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Dest region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regiones.map((region) => (
                      <SelectItem key={region.id} value={region.nombre}>
                        {region.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterDestinoClassification} onValueChange={setFilterDestinoClassification}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Dest class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="A">Class A</SelectItem>
                    <SelectItem value="B">Class B</SelectItem>
                    <SelectItem value="C">Class C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex gap-4 items-center bg-muted p-4 rounded-md">
            <span className="font-medium">{selectedIds.size} selected</span>
            <Button onClick={() => setMassEditDialogOpen(true)}>
              Set Transit Days
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => setMassDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>
            <Button variant="outline" onClick={() => setSelectedIds(new Set())}>
              Clear Selection
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredTransitTimes.length && filteredTransitTimes.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Origin City</TableHead>
                  <TableHead>Origin Region</TableHead>
                  <TableHead>Origin Class</TableHead>
                  <TableHead>Destination City</TableHead>
                  <TableHead>Dest Region</TableHead>
                  <TableHead>Dest Class</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Transit Days</TableHead>
                  <TableHead>Target %</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransitTimes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No transit times configured. Click "Generate All Combinations" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransitTimes.map((tt) => (
                    <TableRow key={tt.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(tt.id)}
                          onCheckedChange={() => toggleSelection(tt.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{tt.ciudad_origen?.codigo}</div>
                        <div className="text-sm text-muted-foreground">{tt.ciudad_origen?.nombre}</div>
                      </TableCell>
                      <TableCell>{tt.ciudad_origen?.region?.nombre || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getClassificationBadgeVariant(tt.ciudad_origen?.clasificacion || "")}>
                          {tt.ciudad_origen?.clasificacion}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{tt.ciudad_destino?.codigo}</div>
                        <div className="text-sm text-muted-foreground">{tt.ciudad_destino?.nombre}</div>
                      </TableCell>
                      <TableCell>{tt.ciudad_destino?.region?.nombre || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getClassificationBadgeVariant(tt.ciudad_destino?.clasificacion || "")}>
                          {tt.ciudad_destino?.clasificacion}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tt.carrier ? (
                          <div className="text-sm">
                            <span className="font-medium">{tt.carrier.carrier_code}</span>
                          </div>
                        ) : (
                          <Badge variant="outline">All</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {tt.producto ? (
                          <div className="text-sm">
                            <span className="font-medium">{tt.producto.codigo_producto}</span>
                          </div>
                        ) : (
                          <Badge variant="outline">All</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={tt.dias_transito === 0 ? "text-destructive font-bold" : "text-green-600 font-bold"}>
                          {tt.dias_transito} {tt.dias_transito === 1 ? "day" : "days"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{tt.target_percentage || 90}%</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingId(tt.id);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingId(tt.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Mass Edit Dialog */}
      <Dialog open={massEditDialogOpen} onOpenChange={setMassEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Transit Days</DialogTitle>
            <DialogDescription>
              Set the number of transit days for {selectedIds.size} selected city pairs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="mass-days" className="text-sm font-medium">
                Transit Days
              </label>
              <Input
                id="mass-days"
                type="number"
                min="0"
                value={massEditDays}
                onChange={(e) => setMassEditDays(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMassEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMassUpdate}>
              Apply to {selectedIds.size} items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Transit Time" : "Add Transit Time"}</DialogTitle>
          </DialogHeader>
          <TransitTimeForm
            transitTimeId={editingId}
            clienteId={clienteId}
            onSuccess={() => {
              setEditDialogOpen(false);
              loadData();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transit time configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate Confirmation Dialog */}
      <AlertDialog open={confirmGenerateOpen} onOpenChange={setConfirmGenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate All Combinations?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will create transit time entries for:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>General routes</strong> (city-to-city without carrier/product)</li>
                <li><strong>Carrier-specific routes</strong> (for each active carrier)</li>
                <li><strong>Product-specific routes</strong> (for each active product)</li>
                <li><strong>Carrier+Product routes</strong> (all combinations)</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Existing combinations will be preserved. This operation may take a few moments.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={generating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={generateAllCombinations} disabled={generating}>
              {generating ? "Generating..." : "Generate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mass Delete Confirmation Dialog */}
      <AlertDialog open={massDeleteDialogOpen} onOpenChange={setMassDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} transit times?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} transit time configurations. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleMassDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
