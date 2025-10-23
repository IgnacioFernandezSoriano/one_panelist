import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateUniqueCode } from "@/lib/codeGenerator";

interface CiudadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function CiudadForm({ onSuccess, onCancel, initialData }: CiudadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientes, setClientes] = useState<Array<{ id: number; nombre: string; codigo: string }>>([]);
  const [regiones, setRegiones] = useState<Array<{ id: number; nombre: string; codigo: string }>>([]);
  const [paises, setPaises] = useState<string[]>([]);
  const [clienteSearch, setClienteSearch] = useState("");
  const [regionSearch, setRegionSearch] = useState("");
  const [paisSearch, setPaisSearch] = useState("");
  const [clienteOpen, setClienteOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [paisOpen, setPaisOpen] = useState(false);
  const { toast } = useToast();
  const isEditing = !!initialData;
  const [formData, setFormData] = useState({
    cliente_id: initialData?.cliente_id?.toString() || "",
    region_id: initialData?.region_id?.toString() || "",
    codigo: initialData?.codigo || "",
    nombre: initialData?.nombre || "",
    codigo_postal_principal: initialData?.codigo_postal_principal || "",
    pais: initialData?.pais || "",
    clasificacion: initialData?.clasificacion || "B",
    latitud: initialData?.latitud?.toString() || "",
    longitud: initialData?.longitud?.toString() || "",
    volumen_poblacional: initialData?.volumen_poblacional?.toString() || "",
    volumen_trafico_postal: initialData?.volumen_trafico_postal?.toString() || "",
    criterio_clasificacion: initialData?.criterio_clasificacion || "",
    descripcion: initialData?.descripcion || "",
    estado: initialData?.estado || "activo",
  });

  useEffect(() => {
    loadClientes();
    loadPaises();
  }, []);

  useEffect(() => {
    if (formData.cliente_id) {
      loadRegiones(parseInt(formData.cliente_id));
    }
  }, [formData.cliente_id]);

  const loadClientes = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, codigo")
      .eq("estado", "activo")
      .order("nombre", { ascending: true });

    if (!error && data) {
      setClientes(data);
    }
  };

  const loadRegiones = async (clienteId: number) => {
    const { data, error } = await supabase
      .from("regiones")
      .select("id, nombre, codigo")
      .eq("cliente_id", clienteId)
      .eq("estado", "activo")
      .order("nombre", { ascending: true });

    if (!error && data) {
      setRegiones(data);
    }
  };

  const loadPaises = async () => {
    const { data, error } = await supabase
      .from("nodos")
      .select("pais")
      .order("pais", { ascending: true });

    if (!error && data) {
      const uniquePaises = Array.from(new Set(data.map(n => n.pais)));
      setPaises(uniquePaises);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let error;
    if (isEditing) {
      const dataToSave = {
        cliente_id: parseInt(formData.cliente_id),
        region_id: parseInt(formData.region_id),
        codigo: formData.codigo,
        nombre: formData.nombre,
        codigo_postal_principal: formData.codigo_postal_principal || null,
        pais: formData.pais,
        clasificacion: formData.clasificacion,
        latitud: parseFloat(formData.latitud),
        longitud: parseFloat(formData.longitud),
        volumen_poblacional: formData.volumen_poblacional ? parseInt(formData.volumen_poblacional) : null,
        volumen_trafico_postal: formData.volumen_trafico_postal ? parseInt(formData.volumen_trafico_postal) : null,
        criterio_clasificacion: formData.criterio_clasificacion || null,
        descripcion: formData.descripcion || null,
        estado: formData.estado,
      };
      const result = await supabase
        .from("ciudades")
        .update(dataToSave)
        .eq("id", initialData.id);
      error = result.error;
    } else {
      // Generar código automáticamente para nuevos registros
      const codigo = await generateUniqueCode("ciudades");
      const dataToSave = {
        cliente_id: parseInt(formData.cliente_id),
        region_id: parseInt(formData.region_id),
        codigo,
        nombre: formData.nombre,
        codigo_postal_principal: formData.codigo_postal_principal || null,
        pais: formData.pais,
        clasificacion: formData.clasificacion,
        latitud: parseFloat(formData.latitud),
        longitud: parseFloat(formData.longitud),
        volumen_poblacional: formData.volumen_poblacional ? parseInt(formData.volumen_poblacional) : null,
        volumen_trafico_postal: formData.volumen_trafico_postal ? parseInt(formData.volumen_trafico_postal) : null,
        criterio_clasificacion: formData.criterio_clasificacion || null,
        descripcion: formData.descripcion || null,
        estado: formData.estado,
      };
      const result = await supabase.from("ciudades").insert([dataToSave]);
      error = result.error;
    }

    if (error) {
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} city`,
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `City ${isEditing ? "updated" : "created"} successfully` });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cliente_id">Client *</Label>
          <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={clienteOpen}
                className="w-full justify-between"
              >
                {formData.cliente_id 
                  ? clientes.find(c => c.id.toString() === formData.cliente_id)?.nombre || "Select client..."
                  : "Select client..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Search client..." 
                  value={clienteSearch}
                  onValueChange={setClienteSearch}
                />
                <CommandList>
                  <CommandEmpty>No client found.</CommandEmpty>
                  <CommandGroup>
                    {clientes
                      .filter(c => 
                        c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
                        c.codigo.toLowerCase().includes(clienteSearch.toLowerCase())
                      )
                      .map((cliente) => (
                        <CommandItem
                          key={cliente.id}
                          value={cliente.id.toString()}
                          onSelect={() => {
                            setFormData({ ...formData, cliente_id: cliente.id.toString(), region_id: "" });
                            setClienteOpen(false);
                            setClienteSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.cliente_id === cliente.id.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {cliente.nombre} ({cliente.codigo})
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="region_id">Region *</Label>
          <Popover open={regionOpen} onOpenChange={setRegionOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={regionOpen}
                className="w-full justify-between"
                disabled={!formData.cliente_id}
              >
                {formData.region_id 
                  ? regiones.find(r => r.id.toString() === formData.region_id)?.nombre || "Select region..."
                  : "Select region..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Search region..." 
                  value={regionSearch}
                  onValueChange={setRegionSearch}
                />
                <CommandList>
                  <CommandEmpty>No region found.</CommandEmpty>
                  <CommandGroup>
                    {regiones
                      .filter(r => 
                        r.nombre.toLowerCase().includes(regionSearch.toLowerCase()) ||
                        r.codigo.toLowerCase().includes(regionSearch.toLowerCase())
                      )
                      .map((region) => (
                        <CommandItem
                          key={region.id}
                          value={region.id.toString()}
                          onSelect={() => {
                            setFormData({ ...formData, region_id: region.id.toString() });
                            setRegionOpen(false);
                            setRegionSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.region_id === region.id.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {region.nombre} ({region.codigo})
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

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
        <Label htmlFor="nombre">Name *</Label>
        <Input
          id="nombre"
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="codigo_postal_principal">Postal Code</Label>
          <Input
            id="codigo_postal_principal"
            value={formData.codigo_postal_principal}
            onChange={(e) => setFormData({ ...formData, codigo_postal_principal: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pais">Country *</Label>
          <Popover open={paisOpen} onOpenChange={setPaisOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={paisOpen}
                className="w-full justify-between"
              >
                {formData.pais || "Select..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Search..." 
                  value={paisSearch}
                  onValueChange={setPaisSearch}
                />
              <CommandList>
                <CommandEmpty>
                  <div className="p-2">
                    <p className="text-sm text-muted-foreground mb-2">No country found.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (paisSearch.trim()) {
                          setFormData({ ...formData, pais: paisSearch.trim() });
                          setPaisOpen(false);
                          setPaisSearch("");
                        }
                      }}
                    >
                      Add "{paisSearch}"
                    </Button>
                  </div>
                </CommandEmpty>
                  <CommandGroup>
                    {paises
                      .filter(p => p.toLowerCase().includes(paisSearch.toLowerCase()))
                      .map((pais) => (
                        <CommandItem
                          key={pais}
                          value={pais}
                          onSelect={() => {
                            setFormData({ ...formData, pais });
                            setPaisOpen(false);
                            setPaisSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.pais === pais ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {pais}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clasificacion">Classification *</Label>
          <Select value={formData.clasificacion} onValueChange={(value) => setFormData({ ...formData, clasificacion: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A - Large City</SelectItem>
              <SelectItem value="B">B - Medium City</SelectItem>
              <SelectItem value="C">C - Small City</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitud">Latitude *</Label>
          <Input
            id="latitud"
            type="number"
            step="0.0000001"
            value={formData.latitud}
            onChange={(e) => setFormData({ ...formData, latitud: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="longitud">Longitude *</Label>
          <Input
            id="longitud"
            type="number"
            step="0.0000001"
            value={formData.longitud}
            onChange={(e) => setFormData({ ...formData, longitud: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="volumen_poblacional">Population Volume</Label>
          <Input
            id="volumen_poblacional"
            type="number"
            value={formData.volumen_poblacional}
            onChange={(e) => setFormData({ ...formData, volumen_poblacional: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="volumen_trafico_postal">Postal Traffic Volume</Label>
          <Input
            id="volumen_trafico_postal"
            type="number"
            value={formData.volumen_trafico_postal}
            onChange={(e) => setFormData({ ...formData, volumen_trafico_postal: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="criterio_clasificacion">Classification Criteria</Label>
          <Select value={formData.criterio_clasificacion} onValueChange={(value) => setFormData({ ...formData, criterio_clasificacion: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="poblacional">Population</SelectItem>
              <SelectItem value="postal">Postal</SelectItem>
              <SelectItem value="mixto">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Description</Label>
        <Textarea
          id="descripcion"
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          rows={2}
        />
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
          {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update City" : "Create City")}
        </Button>
      </div>
    </form>
  );
}
