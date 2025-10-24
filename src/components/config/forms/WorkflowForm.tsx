import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WorkflowFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function WorkflowForm({ onSuccess, onCancel, initialData }: WorkflowFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientes, setClientes] = useState<Array<{ id: number; nombre: string; codigo: string }>>([]);
  const [productos, setProductos] = useState<Array<{ id: number; nombre_producto: string; codigo_producto: string }>>([]);
  const [clienteSearch, setClienteSearch] = useState("");
  const [productoSearch, setProductoSearch] = useState("");
  const [clienteOpen, setClienteOpen] = useState(false);
  const [productoOpen, setProductoOpen] = useState(false);
  const { toast } = useToast();
  const isEditing = !!initialData;
  const [formData, setFormData] = useState({
    cliente_id: initialData?.cliente_id?.toString() || "",
    producto_id: initialData?.producto_id?.toString() || "",
    tipo_dias: initialData?.tipo_dias || "habiles",
    horas_verificacion_recepcion_receptor: initialData?.horas_verificacion_recepcion_receptor?.toString() || "",
    horas_recordatorio_receptor: initialData?.horas_recordatorio_receptor?.toString() || "",
    horas_escalamiento: initialData?.horas_escalamiento?.toString() || "",
    horas_declarar_extravio: initialData?.horas_declarar_extravio?.toString() || "",
    horas_segunda_verificacion_receptor: initialData?.horas_segunda_verificacion_receptor?.toString() || "",
  });

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    if (formData.cliente_id) {
      loadProductos();
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

  const loadProductos = async () => {
    if (!formData.cliente_id) return;
    
    const { data, error } = await supabase
      .from("productos_cliente")
      .select("id, nombre_producto, codigo_producto")
      .eq("cliente_id", parseInt(formData.cliente_id))
      .eq("estado", "activo")
      .order("nombre_producto", { ascending: true });

    if (!error && data) {
      setProductos(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dataToSave = {
      cliente_id: parseInt(formData.cliente_id),
      producto_id: formData.producto_id ? parseInt(formData.producto_id) : null,
      tipo_dias: formData.tipo_dias,
      horas_verificacion_recepcion_receptor: parseInt(formData.horas_verificacion_recepcion_receptor),
      horas_recordatorio_receptor: parseInt(formData.horas_recordatorio_receptor),
      horas_escalamiento: parseInt(formData.horas_escalamiento),
      horas_declarar_extravio: parseInt(formData.horas_declarar_extravio),
      horas_segunda_verificacion_receptor: formData.horas_segunda_verificacion_receptor ? parseInt(formData.horas_segunda_verificacion_receptor) : null,
    };

    let error;
    if (isEditing) {
      const result = await supabase
        .from("configuracion_workflows")
        .update(dataToSave)
        .eq("id", initialData.id);
      error = result.error;
    } else {
      const result = await supabase.from("configuracion_workflows").insert([dataToSave]);
      error = result.error;
    }

    if (error) {
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} workflow`,
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `Workflow ${isEditing ? "updated" : "created"} successfully` });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
          Configure workflow parameters to automate notifications and escalations for each account's postal service.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="cliente_id">Account *</Label>
        <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={clienteOpen}
              className="w-full justify-between"
            >
              {formData.cliente_id 
                ? clientes.find(c => c.id.toString() === formData.cliente_id)?.nombre || "Select account..."
                : "Select account..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput 
                placeholder="Search account..." 
                value={clienteSearch}
                onValueChange={setClienteSearch}
              />
              <CommandList>
                <CommandEmpty>No account found.</CommandEmpty>
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
                          setFormData({ ...formData, cliente_id: cliente.id.toString(), producto_id: "" });
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
        <p className="text-xs text-muted-foreground">
          Select the account for which this workflow configuration will apply
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="producto_id">Product</Label>
        <Popover open={productoOpen} onOpenChange={setProductoOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={productoOpen}
              className="w-full justify-between"
              disabled={!formData.cliente_id}
            >
              {formData.producto_id 
                ? productos.find(p => p.id.toString() === formData.producto_id)?.nombre_producto || "Select product..."
                : "Select product..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput 
                placeholder="Search product..." 
                value={productoSearch}
                onValueChange={setProductoSearch}
              />
              <CommandList>
                <CommandEmpty>No product found.</CommandEmpty>
                <CommandGroup>
                  {productos
                    .filter(p => 
                      p.nombre_producto.toLowerCase().includes(productoSearch.toLowerCase()) ||
                      p.codigo_producto.toLowerCase().includes(productoSearch.toLowerCase())
                    )
                    .map((producto) => (
                      <CommandItem
                        key={producto.id}
                        value={producto.id.toString()}
                        onSelect={() => {
                          setFormData({ ...formData, producto_id: producto.id.toString() });
                          setProductoOpen(false);
                          setProductoSearch("");
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.producto_id === producto.id.toString() ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {producto.nombre_producto} ({producto.codigo_producto})
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          (Optional) Select a specific product for this workflow configuration
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo_dias">Day Type *</Label>
        <Select value={formData.tipo_dias} onValueChange={(value) => setFormData({ ...formData, tipo_dias: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="habiles">Business Days</SelectItem>
            <SelectItem value="calendario">Calendar Days</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Business Days:</span> Excludes weekends and holidays | <span className="font-medium">Calendar Days:</span> Counts all days
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="horas_verificacion_recepcion_receptor">Receiver Verification (hours) *</Label>
            <Input
              id="horas_verificacion_recepcion_receptor"
              type="number"
              min="1"
              value={formData.horas_verificacion_recepcion_receptor}
              onChange={(e) => setFormData({ ...formData, horas_verificacion_recepcion_receptor: e.target.value })}
              required
              placeholder="e.g., 72"
            />
            <p className="text-xs text-muted-foreground">
              Hours to wait before requesting receiver panelist to verify reception
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="horas_recordatorio_receptor">Receiver Reminder (hours) *</Label>
            <Input
              id="horas_recordatorio_receptor"
              type="number"
              min="1"
              value={formData.horas_recordatorio_receptor}
              onChange={(e) => setFormData({ ...formData, horas_recordatorio_receptor: e.target.value })}
              required
              placeholder="e.g., 48"
            />
            <p className="text-xs text-muted-foreground">
              Hours after verification request before sending reminder to receiver
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="horas_escalamiento">Escalation (hours) *</Label>
            <Input
              id="horas_escalamiento"
              type="number"
              min="1"
              value={formData.horas_escalamiento}
              onChange={(e) => setFormData({ ...formData, horas_escalamiento: e.target.value })}
              required
              placeholder="e.g., 120"
            />
            <p className="text-xs text-muted-foreground">
              Hours after reminder before escalating to supervisor
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="horas_declarar_extravio">Loss Declaration (hours) *</Label>
            <Input
              id="horas_declarar_extravio"
              type="number"
              min="1"
              value={formData.horas_declarar_extravio}
              onChange={(e) => setFormData({ ...formData, horas_declarar_extravio: e.target.value })}
              required
              placeholder="e.g., 360"
            />
            <p className="text-xs text-muted-foreground">
              Hours after escalation before declaring shipment as lost
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="horas_segunda_verificacion_receptor">Receiver 2nd Verification (hours)</Label>
            <Input
              id="horas_segunda_verificacion_receptor"
              type="number"
              min="1"
              value={formData.horas_segunda_verificacion_receptor}
              onChange={(e) => setFormData({ ...formData, horas_segunda_verificacion_receptor: e.target.value })}
              placeholder="e.g., 168"
            />
            <p className="text-xs text-muted-foreground">
              (Optional) Hours for a second verification attempt with receiver
            </p>
          </div>
        </div>

        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Workflow Timeline Example:</span> Hour 0 → Shipment created | Hour 72 → Verification request to receiver | Hour 120 → Reminder to receiver | Hour 240 → Escalation | Hour 600 → Loss declaration
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Workflow" : "Create Workflow")}
        </Button>
      </div>
    </form>
  );
}