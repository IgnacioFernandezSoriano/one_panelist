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

interface RegionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function RegionForm({ onSuccess, onCancel, initialData }: RegionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientes, setClientes] = useState<Array<{ id: number; nombre: string; codigo: string }>>([]);
  const [paises, setPaises] = useState<string[]>([]);
  const [clienteSearch, setClienteSearch] = useState("");
  const [paisSearch, setPaisSearch] = useState("");
  const [clienteOpen, setClienteOpen] = useState(false);
  const [paisOpen, setPaisOpen] = useState(false);
  const { toast } = useToast();
  const isEditing = !!initialData;
  const [formData, setFormData] = useState({
    cliente_id: initialData?.cliente_id?.toString() || "",
    codigo: initialData?.codigo || "",
    nombre: initialData?.nombre || "",
    pais: initialData?.pais || "",
    descripcion: initialData?.descripcion || "",
    estado: initialData?.estado || "activo",
  });

  useEffect(() => {
    loadClientes();
    loadPaises();
  }, []);

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
        codigo: formData.codigo,
        nombre: formData.nombre,
        pais: formData.pais,
        descripcion: formData.descripcion || null,
        estado: formData.estado,
      };
      const result = await supabase
        .from("regiones")
        .update(dataToSave)
        .eq("id", initialData.id);
      error = result.error;
    } else {
      // Generar código automáticamente para nuevos registros
      const codigo = await generateUniqueCode("regiones");
      const dataToSave = {
        cliente_id: parseInt(formData.cliente_id),
        codigo,
        nombre: formData.nombre,
        pais: formData.pais,
        descripcion: formData.descripcion || null,
        estado: formData.estado,
      };
      const result = await supabase.from("regiones").insert([dataToSave]);
      error = result.error;
    }

    if (error) {
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} region`,
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `Region ${isEditing ? "updated" : "created"} successfully` });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
                          setFormData({ ...formData, cliente_id: cliente.id.toString() });
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
              {formData.pais || "Select country..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput 
                placeholder="Search country..." 
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
        <Label htmlFor="descripcion">Description</Label>
        <Textarea
          id="descripcion"
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          rows={3}
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
          {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Region" : "Create Region")}
        </Button>
      </div>
    </form>
  );
}
