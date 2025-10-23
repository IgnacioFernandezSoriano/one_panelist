import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateUniqueCode } from "@/lib/codeGenerator";

interface NodoFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function NodoForm({ onSuccess, onCancel, initialData }: NodoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paises, setPaises] = useState<string[]>([]);
  const [paisSearch, setPaisSearch] = useState("");
  const [paisOpen, setPaisOpen] = useState(false);
  const { toast } = useToast();
  const isEditing = !!initialData;
  const [formData, setFormData] = useState({
    codigo: initialData?.codigo || "",
    nombre: initialData?.nombre || "",
    tipo: initialData?.tipo || "urbano",
    ciudad: initialData?.ciudad || "",
    pais: initialData?.pais || "",
    estado: initialData?.estado || "activo",
  });

  useEffect(() => {
    loadPaises();
  }, []);

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
      const result = await supabase
        .from("nodos")
        .update(formData)
        .eq("codigo", initialData.codigo);
      error = result.error;
    } else {
      // Generar código automáticamente para nuevos registros
      const codigo = await generateUniqueCode("nodos");
      const dataToInsert = { ...formData, codigo };
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

  return (
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
        <Label htmlFor="nombre">Name *</Label>
        <Input
          id="nombre"
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo">Type *</Label>
        <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="urbano">Urban</SelectItem>
            <SelectItem value="rural">Rural</SelectItem>
            <SelectItem value="centro_distribucion">Distribution Center</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ciudad">City *</Label>
        <Input
          id="ciudad"
          value={formData.ciudad}
          onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
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
  );
}