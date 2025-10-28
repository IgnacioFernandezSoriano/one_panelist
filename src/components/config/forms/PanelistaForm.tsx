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

interface PanelistaFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function PanelistaForm({ onSuccess, onCancel, initialData }: PanelistaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nodos, setNodos] = useState<Array<{ codigo: string }>>([]);
  const [gestores, setGestores] = useState<Array<{ id: number; nombre_completo: string }>>([]);
  const [paises, setPaises] = useState<string[]>([]);
  const [nodoSearch, setNodoSearch] = useState("");
  const [gestorSearch, setGestorSearch] = useState("");
  const [paisSearch, setPaisSearch] = useState("");
  const [nodoOpen, setNodoOpen] = useState(false);
  const [gestorOpen, setGestorOpen] = useState(false);
  const [paisOpen, setPaisOpen] = useState(false);
  const { toast } = useToast();
  const isEditing = !!initialData?.id;
  const [formData, setFormData] = useState({
    nombre_completo: initialData?.nombre_completo || "",
    email: initialData?.email || "",
    telefono: initialData?.telefono || "",
    direccion_calle: initialData?.direccion_calle || "",
    direccion_ciudad: initialData?.direccion_ciudad || "",
    direccion_codigo_postal: initialData?.direccion_codigo_postal || "",
    direccion_pais: initialData?.direccion_pais || "",
    nodo_asignado: initialData?.nodo_asignado || "",
    idioma: initialData?.idioma || "es",
    zona_horaria: initialData?.zona_horaria || "Europe/Madrid",
    horario_inicio: initialData?.horario_inicio || "09:00:00",
    horario_fin: initialData?.horario_fin || "18:00:00",
    plataforma_preferida: initialData?.plataforma_preferida || "whatsapp",
    dias_comunicacion: initialData?.dias_comunicacion || "ambos",
    gestor_asignado_id: initialData?.gestor_asignado_id?.toString() || "",
    estado: initialData?.estado || "activo",
  });

  useEffect(() => {
    loadNodos();
    loadGestores();
    loadPaises();
  }, []);

  const loadNodos = async () => {
    const { data, error } = await supabase
      .from("nodos")
      .select("codigo")
      .eq("estado", "activo")
      .order("codigo", { ascending: true });

    if (!error && data) {
      setNodos(data);
    }
  };

  const loadGestores = async () => {
    // Get users who have coordinator or manager roles
    const { data: userRolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["coordinator", "manager", "admin", "superadmin"]);

    if (rolesError || !userRolesData || userRolesData.length === 0) {
      setGestores([]);
      return;
    }

    const userIds = userRolesData.map(ur => ur.user_id);

    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nombre_completo")
      .eq("estado", "activo")
      .in("id", userIds)
      .order("nombre_completo", { ascending: true });

    if (!error && data) {
      setGestores(data);
    }
  };

  const loadPaises = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("pais")
      .order("pais", { ascending: true });

    if (!error && data) {
      const uniquePaises = Array.from(new Set(data.map(c => c.pais).filter(p => p)));
      setPaises(uniquePaises);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dataToSave = {
      ...formData,
      gestor_asignado_id: formData.gestor_asignado_id ? parseInt(formData.gestor_asignado_id) : null,
      ciudad_id: null, // No usamos este campo por ahora
    };

    let error;
    if (isEditing) {
      const result = await supabase
        .from("panelistas")
        .update(dataToSave)
        .eq("id", initialData.id);
      error = result.error;
    } else {
      const result = await supabase.from("panelistas").insert([dataToSave]);
      error = result.error;
    }

    if (error) {
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} panelist`,
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `Panelist ${isEditing ? "updated" : "created"} successfully` });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nombre_completo">Full Name *</Label>
          <Input
            id="nombre_completo"
            value={formData.nombre_completo}
            onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefono">Phone * (International Format)</Label>
          <Input
            id="telefono"
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            placeholder="+34600123456"
            required
            pattern="^\+[1-9]\d{1,14}$"
            title="Format: +[country code][number] (e.g., +34600123456)"
          />
          <p className="text-xs text-muted-foreground">
            Format: +[country code][number] (e.g., +34600123456, +52155123456, +12025551234)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nodo_asignado">Assigned Node</Label>
          <Popover open={nodoOpen} onOpenChange={setNodoOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={nodoOpen}
                className="w-full justify-between"
              >
                {formData.nodo_asignado 
                  ? formData.nodo_asignado
                  : "Select node..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Search node..." 
                  value={nodoSearch}
                  onValueChange={setNodoSearch}
                />
                <CommandList>
                  <CommandEmpty>No node found.</CommandEmpty>
                  <CommandGroup>
                    {nodos
                      .filter(n => 
                        n.codigo.toLowerCase().includes(nodoSearch.toLowerCase())
                      )
                      .map((nodo) => (
                        <CommandItem
                          key={nodo.codigo}
                          value={nodo.codigo}
                          onSelect={() => {
                            setFormData({ ...formData, nodo_asignado: nodo.codigo });
                            setNodoOpen(false);
                            setNodoSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.nodo_asignado === nodo.codigo ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {nodo.codigo}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="direccion_calle">Street Address *</Label>
        <Input
          id="direccion_calle"
          value={formData.direccion_calle}
          onChange={(e) => setFormData({ ...formData, direccion_calle: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="direccion_ciudad">City *</Label>
          <Input
            id="direccion_ciudad"
            value={formData.direccion_ciudad}
            onChange={(e) => setFormData({ ...formData, direccion_ciudad: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="direccion_codigo_postal">Postal Code *</Label>
          <Input
            id="direccion_codigo_postal"
            value={formData.direccion_codigo_postal}
            onChange={(e) => setFormData({ ...formData, direccion_codigo_postal: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="direccion_pais">Country *</Label>
          <Popover open={paisOpen} onOpenChange={setPaisOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={paisOpen}
                className="w-full justify-between"
              >
                {formData.direccion_pais || "Select country..."}
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
                            setFormData({ ...formData, direccion_pais: paisSearch.trim() });
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
                            setFormData({ ...formData, direccion_pais: pais });
                            setPaisOpen(false);
                            setPaisSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.direccion_pais === pais ? "opacity-100" : "opacity-0"
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="idioma">Language *</Label>
          <Select value={formData.idioma} onValueChange={(value) => setFormData({ ...formData, idioma: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Spanish (es)</SelectItem>
              <SelectItem value="en">English (en)</SelectItem>
              <SelectItem value="pt">Portuguese (pt)</SelectItem>
              <SelectItem value="fr">French (fr)</SelectItem>
              <SelectItem value="ar">Arabic (ar)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zona_horaria">Timezone *</Label>
          <Input
            id="zona_horaria"
            value={formData.zona_horaria}
            onChange={(e) => setFormData({ ...formData, zona_horaria: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="horario_inicio">Start Time *</Label>
          <Input
            id="horario_inicio"
            type="time"
            value={formData.horario_inicio}
            onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value + ":00" })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="horario_fin">End Time *</Label>
          <Input
            id="horario_fin"
            type="time"
            value={formData.horario_fin}
            onChange={(e) => setFormData({ ...formData, horario_fin: e.target.value + ":00" })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="plataforma_preferida">Preferred Platform *</Label>
          <Select value={formData.plataforma_preferida} onValueChange={(value) => setFormData({ ...formData, plataforma_preferida: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dias_comunicacion">Communication Days *</Label>
          <Select value={formData.dias_comunicacion} onValueChange={(value) => setFormData({ ...formData, dias_comunicacion: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dias_laborables">Weekdays</SelectItem>
              <SelectItem value="fines_semana">Weekends</SelectItem>
              <SelectItem value="ambos">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gestor_asignado_id">Assigned Manager</Label>
          <Popover open={gestorOpen} onOpenChange={setGestorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={gestorOpen}
                className="w-full justify-between"
              >
                {formData.gestor_asignado_id 
                  ? gestores.find(g => g.id.toString() === formData.gestor_asignado_id)?.nombre_completo || "Select manager..."
                  : "Select manager..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Search manager..." 
                  value={gestorSearch}
                  onValueChange={setGestorSearch}
                />
                <CommandList>
                  <CommandEmpty>No manager found.</CommandEmpty>
                  <CommandGroup>
                    {gestores
                      .filter(g => g.nombre_completo.toLowerCase().includes(gestorSearch.toLowerCase()))
                      .map((gestor) => (
                        <CommandItem
                          key={gestor.id}
                          value={gestor.id.toString()}
                          onSelect={() => {
                            setFormData({ ...formData, gestor_asignado_id: gestor.id.toString() });
                            setGestorOpen(false);
                            setGestorSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.gestor_asignado_id === gestor.id.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {gestor.nombre_completo}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Panelist" : "Create Panelist")}
        </Button>
      </div>
    </form>
  );
}