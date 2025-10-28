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
import { useTranslation } from "@/hooks/useTranslation";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WorkflowFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function WorkflowForm({ onSuccess, onCancel, initialData }: WorkflowFormProps) {
  const { t } = useTranslation();
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
    hours_sender_first_reminder: initialData?.hours_sender_first_reminder?.toString() || "24",
    hours_sender_second_reminder: initialData?.hours_sender_second_reminder?.toString() || "48",
    hours_sender_escalation: initialData?.hours_sender_escalation?.toString() || "72",
    hours_receiver_verification: initialData?.hours_receiver_verification?.toString() || "48",
    hours_receiver_escalation: initialData?.hours_receiver_escalation?.toString() || "72",
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
      hours_sender_first_reminder: parseInt(formData.hours_sender_first_reminder),
      hours_sender_second_reminder: parseInt(formData.hours_sender_second_reminder),
      hours_sender_escalation: parseInt(formData.hours_sender_escalation),
      hours_receiver_verification: parseInt(formData.hours_receiver_verification),
      hours_receiver_escalation: parseInt(formData.hours_receiver_escalation),
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
        <Label htmlFor="cliente_id">{t('label.account')} *</Label>
        <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={clienteOpen}
              className="w-full justify-between"
            >
              {formData.cliente_id 
                ? clientes.find(c => c.id.toString() === formData.cliente_id)?.nombre || t('form.select_account')
                : t('form.select_account')}
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

      <div className="space-y-6">
        <div className="border-l-4 border-primary pl-4">
          <h3 className="font-semibold text-lg mb-4">Sender Panelist Workflow</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Triggered when status is SENT and due date (fecha_limite) has passed
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours_sender_first_reminder">1st Reminder (hours) *</Label>
              <Input
                id="hours_sender_first_reminder"
                type="number"
                min="1"
                value={formData.hours_sender_first_reminder}
                onChange={(e) => setFormData({ ...formData, hours_sender_first_reminder: e.target.value })}
                required
                placeholder="e.g., 24"
              />
              <p className="text-xs text-muted-foreground">
                Hours after due date to send first reminder to sender
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours_sender_second_reminder">2nd Reminder (hours) *</Label>
              <Input
                id="hours_sender_second_reminder"
                type="number"
                min="1"
                value={formData.hours_sender_second_reminder}
                onChange={(e) => setFormData({ ...formData, hours_sender_second_reminder: e.target.value })}
                required
                placeholder="e.g., 48"
              />
              <p className="text-xs text-muted-foreground">
                Hours after 1st reminder to send second reminder
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours_sender_escalation">Escalation (hours) *</Label>
              <Input
                id="hours_sender_escalation"
                type="number"
                min="1"
                value={formData.hours_sender_escalation}
                onChange={(e) => setFormData({ ...formData, hours_sender_escalation: e.target.value })}
                required
                placeholder="e.g., 72"
              />
              <p className="text-xs text-muted-foreground">
                Hours after 2nd reminder to escalate
              </p>
            </div>
          </div>
        </div>

        <div className="border-l-4 border-accent pl-4">
          <h3 className="font-semibold text-lg mb-4">Receiver Panelist Workflow</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Triggered when status is SENT and standard delivery time (defined in product) has passed
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours_receiver_verification">Verification Request (hours) *</Label>
              <Input
                id="hours_receiver_verification"
                type="number"
                min="1"
                value={formData.hours_receiver_verification}
                onChange={(e) => setFormData({ ...formData, hours_receiver_verification: e.target.value })}
                required
                placeholder="e.g., 48"
              />
              <p className="text-xs text-muted-foreground">
                Hours after standard delivery time to request verification
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours_receiver_escalation">Escalation (hours) *</Label>
              <Input
                id="hours_receiver_escalation"
                type="number"
                min="1"
                value={formData.hours_receiver_escalation}
                onChange={(e) => setFormData({ ...formData, hours_receiver_escalation: e.target.value })}
                required
                placeholder="e.g., 72"
              />
              <p className="text-xs text-muted-foreground">
                Hours after verification request to escalate
              </p>
            </div>
          </div>
        </div>

        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
            <span className="font-semibold">Example Timeline:</span><br/>
            <strong>Sender:</strong> Due date passes → +{formData.hours_sender_first_reminder}h 1st reminder → +{formData.hours_sender_second_reminder}h 2nd reminder → +{formData.hours_sender_escalation}h escalation<br/>
            <strong>Receiver:</strong> Standard delivery time passes → +{formData.hours_receiver_verification}h verification request → +{formData.hours_receiver_escalation}h escalation
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