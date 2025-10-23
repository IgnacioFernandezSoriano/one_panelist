import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PanelistaForm } from "./PanelistaForm";

interface NodoFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function NodoForm({ onSuccess, onCancel, initialData }: NodoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [regiones, setRegiones] = useState<any[]>([]);
  const [ciudades, setCiudades] = useState<any[]>([]);
  const [panelistas, setPanelistas] = useState<any[]>([]);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [ciudadOpen, setCiudadOpen] = useState(false);
  const [panelistaOpen, setPanelistaOpen] = useState(false);
  const [createPanelistaOpen, setCreatePanelistaOpen] = useState(false);
  const { toast } = useToast();
  const isEditing = !!initialData;
  const [formData, setFormData] = useState({
    codigo: initialData?.codigo || "",
    cliente_id: initialData?.cliente_id?.toString() || "",
    region_id: initialData?.region_id?.toString() || "",
    ciudad_id: initialData?.ciudad_id?.toString() || "",
    panelista_id: initialData?.panelista_id?.toString() || "",
    pais: initialData?.pais || "",
    ciudad: initialData?.ciudad || "",
    estado: initialData?.estado || "activo",
  });

  useEffect(() => {
    loadClientes();
    loadPanelistas();
  }, []);

  useEffect(() => {
    if (formData.cliente_id) {
      loadRegiones(parseInt(formData.cliente_id));
    } else {
      setRegiones([]);
      setFormData(prev => ({ ...prev, region_id: "", ciudad_id: "" }));
    }
  }, [formData.cliente_id]);

  useEffect(() => {
    if (formData.region_id) {
      loadCiudades(parseInt(formData.region_id));
    } else {
      setCiudades([]);
      setFormData(prev => ({ ...prev, ciudad_id: "" }));
    }
  }, [formData.region_id]);

  const loadClientes = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("estado", "activo")
      .order("nombre", { ascending: true });

    if (!error && data) {
      setClientes(data);
    }
  };

  const loadRegiones = async (clienteId: number) => {
    const { data, error } = await supabase
      .from("regiones")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("estado", "activo")
      .order("nombre", { ascending: true });

    if (!error && data) {
      setRegiones(data);
    }
  };

  const loadCiudades = async (regionId: number) => {
    const { data, error } = await supabase
      .from("ciudades")
      .select("*")
      .eq("region_id", regionId)
      .eq("estado", "activo")
      .order("nombre", { ascending: true });

    if (!error && data) {
      setCiudades(data);
    }
  };

  const loadPanelistas = async () => {
    const { data, error } = await supabase
      .from("panelistas")
      .select("id, nombre_completo")
      .eq("estado", "activo")
      .order("nombre_completo", { ascending: true });

    if (!error && data) {
      setPanelistas(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_id || !formData.region_id || !formData.ciudad_id) {
      toast({
        title: "Error",
        description: "Please select client, region and city",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    let error;
    if (isEditing) {
      const result = await supabase
        .from("nodos")
        .update({
          region_id: parseInt(formData.region_id),
          ciudad_id: parseInt(formData.ciudad_id),
          panelista_id: formData.panelista_id ? parseInt(formData.panelista_id) : null,
          pais: formData.pais,
          ciudad: formData.ciudad,
          estado: formData.estado,
        })
        .eq("codigo", initialData.codigo);
      error = result.error;
    } else {
      // Generar código automático: pais-region-ciudad-secuencial
      const cliente = clientes.find(c => c.id === parseInt(formData.cliente_id));
      const region = regiones.find(r => r.id === parseInt(formData.region_id));
      const ciudad = ciudades.find(c => c.id === parseInt(formData.ciudad_id));

      if (!cliente || !region || !ciudad) {
        toast({
          title: "Error",
          description: "Could not find selected entities",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Obtener el último secuencial para esta combinación
      const { data: existingNodos, error: fetchError } = await supabase
        .from("nodos")
        .select("codigo")
        .like("codigo", `${cliente.codigo}-${region.codigo}-${ciudad.codigo}-%`)
        .order("codigo", { ascending: false })
        .limit(1);

      if (fetchError) {
        toast({
          title: "Error",
          description: fetchError.message,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      let secuencial = 1;
      if (existingNodos && existingNodos.length > 0) {
        const lastCode = existingNodos[0].codigo;
        const parts = lastCode.split("-");
        secuencial = parseInt(parts[parts.length - 1]) + 1;
      }

      const codigo = `${cliente.codigo}-${region.codigo}-${ciudad.codigo}-${secuencial.toString().padStart(4, "0")}`;

      const dataToInsert = {
        codigo,
        region_id: parseInt(formData.region_id),
        ciudad_id: parseInt(formData.ciudad_id),
        panelista_id: formData.panelista_id ? parseInt(formData.panelista_id) : null,
        pais: formData.pais,
        ciudad: formData.ciudad,
        estado: formData.estado,
      };

      const result = await supabase.from("nodos").insert([dataToInsert]);
      error = result.error;
    }

    if (error) {
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} node`,
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `Node ${isEditing ? "updated" : "created"} successfully` });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === parseInt(clienteId));
    setFormData({ 
      ...formData, 
      cliente_id: clienteId,
      pais: cliente?.pais || "",
      region_id: "",
      ciudad_id: "",
      ciudad: "",
    });
  };

  const handleRegionChange = (regionId: string) => {
    setFormData({ 
      ...formData, 
      region_id: regionId,
      ciudad_id: "",
      ciudad: "",
    });
  };

  const handleCiudadChange = (ciudadId: string) => {
    const ciudad = ciudades.find(c => c.id === parseInt(ciudadId));
    setFormData({ 
      ...formData, 
      ciudad_id: ciudadId,
      ciudad: ciudad?.nombre || "",
    });
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-4">
      {isEditing && (
        <div className="space-y-2">
          <Label htmlFor="codigo">Code</Label>
          <Input
            id="codigo"
            value={formData.codigo}
            disabled
            className="bg-muted"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Client *</Label>
        <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={clienteOpen}
              className="w-full justify-between"
              disabled={isEditing}
            >
              {formData.cliente_id 
                ? clientes.find(c => c.id === parseInt(formData.cliente_id))?.nombre
                : "Select client..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Search client..." />
              <CommandList>
                <CommandEmpty>No client found.</CommandEmpty>
                <CommandGroup>
                  {clientes.map((cliente) => (
                    <CommandItem
                      key={cliente.id}
                      value={cliente.nombre}
                      onSelect={() => {
                        handleClienteChange(cliente.id.toString());
                        setClienteOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.cliente_id === cliente.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {cliente.nombre}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Panelist (Optional)</Label>
        <Popover open={panelistaOpen} onOpenChange={setPanelistaOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={panelistaOpen}
              className="w-full justify-between"
            >
              {formData.panelista_id 
                ? panelistas.find(p => p.id === parseInt(formData.panelista_id))?.nombre_completo
                : "Select panelist..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Search panelist..." />
              <CommandList>
                <CommandEmpty>
                  <div className="p-2 space-y-2">
                    <p className="text-sm text-muted-foreground">No panelist found.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => {
                        setPanelistaOpen(false);
                        setCreatePanelistaOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Create new panelist
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value=""
                    onSelect={() => {
                      setFormData({ ...formData, panelista_id: "" });
                      setPanelistaOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !formData.panelista_id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    (None)
                  </CommandItem>
                  {panelistas.map((panelista) => (
                    <CommandItem
                      key={panelista.id}
                      value={panelista.nombre_completo}
                      onSelect={() => {
                        setFormData({ ...formData, panelista_id: panelista.id.toString() });
                        setPanelistaOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.panelista_id === panelista.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {panelista.nombre_completo}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Region *</Label>
        <Popover open={regionOpen} onOpenChange={setRegionOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={regionOpen}
              className="w-full justify-between"
              disabled={!formData.cliente_id || isEditing}
            >
              {formData.region_id 
                ? regiones.find(r => r.id === parseInt(formData.region_id))?.nombre
                : "Select region..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Search region..." />
              <CommandList>
                <CommandEmpty>No region found.</CommandEmpty>
                <CommandGroup>
                  {regiones.map((region) => (
                    <CommandItem
                      key={region.id}
                      value={region.nombre}
                      onSelect={() => {
                        handleRegionChange(region.id.toString());
                        setRegionOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.region_id === region.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {region.nombre}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>City *</Label>
        <Popover open={ciudadOpen} onOpenChange={setCiudadOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={ciudadOpen}
              className="w-full justify-between"
              disabled={!formData.region_id || isEditing}
            >
              {formData.ciudad_id 
                ? ciudades.find(c => c.id === parseInt(formData.ciudad_id))?.nombre
                : "Select city..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Search city..." />
              <CommandList>
                <CommandEmpty>No city found.</CommandEmpty>
                <CommandGroup>
                  {ciudades.map((ciudad) => (
                    <CommandItem
                      key={ciudad.id}
                      value={ciudad.nombre}
                      onSelect={() => {
                        handleCiudadChange(ciudad.id.toString());
                        setCiudadOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.ciudad_id === ciudad.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {ciudad.nombre}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="estado">Status</Label>
        <Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activo">Active</SelectItem>
            <SelectItem value="inactivo">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Node" : "Create Node")}
        </Button>
      </div>
    </form>

    <Dialog open={createPanelistaOpen} onOpenChange={setCreatePanelistaOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Panelist</DialogTitle>
        </DialogHeader>
        <PanelistaForm
          initialData={{
            nodo_asignado: formData.codigo
          }}
          onSuccess={async () => {
            // Recargar lista de panelistas
            await loadPanelistas();
            
            // Obtener el último panelista creado
            const { data: lastPanelista } = await supabase
              .from("panelistas")
              .select("id")
              .order("id", { ascending: false })
              .limit(1)
              .single();
            
            if (lastPanelista) {
              setFormData({ ...formData, panelista_id: lastPanelista.id.toString() });
            }
            
            setCreatePanelistaOpen(false);
            toast({ title: "Panelist created and assigned successfully" });
          }}
          onCancel={() => setCreatePanelistaOpen(false)}
        />
      </DialogContent>
    </Dialog>
    </>
  );
}