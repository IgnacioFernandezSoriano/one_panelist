import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PlanConfiguration {
  cliente_id: number;
  carrier_id: number;
  producto_id: number;
  start_date: Date;
  end_date: Date;
  total_events: number;
  max_events_per_week: number;
  merge_strategy: 'append' | 'replace';
}

interface PlanConfigurationFormProps {
  initialConfig?: Partial<PlanConfiguration>;
  onSubmit: (config: PlanConfiguration) => void;
  onCancel: () => void;
}

export function PlanConfigurationForm({ initialConfig, onSubmit, onCancel }: PlanConfigurationFormProps) {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [defaultMaxEvents, setDefaultMaxEvents] = useState(5);
  
  const [formData, setFormData] = useState<Partial<PlanConfiguration>>({
    merge_strategy: 'append',
    max_events_per_week: 5,
    ...initialConfig,
  });

  useEffect(() => {
    initializeForm();
  }, []);

  useEffect(() => {
    if (formData.cliente_id) {
      loadCarriers(formData.cliente_id);
      loadDefaultMaxEvents(formData.cliente_id);
    }
  }, [formData.cliente_id]);

  useEffect(() => {
    if (formData.carrier_id && formData.cliente_id) {
      loadProductos(formData.carrier_id, formData.cliente_id);
    }
  }, [formData.carrier_id, formData.cliente_id]);

  const initializeForm = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('usuarios')
        .select('rol, cliente_id')
        .eq('id', user.id)
        .single();

      const isSuperAdmin = userData?.rol === 'superadmin';
      setIsSuperAdmin(isSuperAdmin);

      if (isSuperAdmin) {
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nombre')
          .eq('estado', 'activo')
          .order('nombre');
        setClientes(clientesData || []);
      } else {
        setFormData(prev => ({ ...prev, cliente_id: userData?.cliente_id }));
        if (userData?.cliente_id) {
          loadCarriers(userData.cliente_id);
          loadDefaultMaxEvents(userData.cliente_id);
        }
      }
    } catch (error) {
      console.error("Error initializing form:", error);
    }
  };

  const loadDefaultMaxEvents = async (clienteId: number) => {
    try {
      const { data } = await supabase
        .from('clientes')
        .select('max_events_per_panelist_week')
        .eq('id', clienteId)
        .single();
      
      if (data) {
        const maxEvents = data.max_events_per_panelist_week || 5;
        setDefaultMaxEvents(maxEvents);
        setFormData(prev => ({ ...prev, max_events_per_week: maxEvents }));
      }
    } catch (error) {
      console.error("Error loading default max events:", error);
    }
  };

  const loadCarriers = async (clienteId: number) => {
    try {
      const { data, error } = await supabase
        .from('carriers')
        .select('id, commercial_name')
        .eq('cliente_id', clienteId)
        .eq('estado', 'activo')
        .order('commercial_name');

      if (error) throw error;
      setCarriers(data || []);
    } catch (error) {
      console.error("Error loading carriers:", error);
    }
  };

  const loadProductos = async (carrierId: number, clienteId: number) => {
    try {
      const { data, error } = await supabase
        .from('carrier_productos')
        .select(`
          producto_id,
          productos_cliente (
            id,
            nombre_producto,
            codigo_producto
          )
        `)
        .eq('carrier_id', carrierId)
        .eq('cliente_id', clienteId);

      if (error) throw error;
      
      const productosData = (data || [])
        .filter(item => item.productos_cliente)
        .map(item => item.productos_cliente);
      
      setProductos(productosData);
    } catch (error) {
      console.error("Error loading productos:", error);
    }
  };

  const handleSubmit = () => {
    if (!formData.cliente_id || !formData.carrier_id || !formData.producto_id ||
        !formData.start_date || !formData.end_date || !formData.total_events ||
        !formData.max_events_per_week || !formData.merge_strategy) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.end_date <= formData.start_date) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    if (formData.total_events <= 0) {
      toast({
        title: "Validation Error",
        description: "Total events must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    onSubmit(formData as PlanConfiguration);
  };

  return (
    <div className="space-y-6">
      {isSuperAdmin && (
        <div className="space-y-2">
          <Label htmlFor="cliente">Account *</Label>
          <Select
            value={formData.cliente_id?.toString()}
            onValueChange={(value) => setFormData({ ...formData, cliente_id: parseInt(value), carrier_id: undefined, producto_id: undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id.toString()}>
                  {cliente.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="carrier">Carrier *</Label>
        <Select
          value={formData.carrier_id?.toString()}
          onValueChange={(value) => setFormData({ ...formData, carrier_id: parseInt(value), producto_id: undefined })}
          disabled={!formData.cliente_id}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select carrier" />
          </SelectTrigger>
          <SelectContent>
            {carriers.map((carrier) => (
              <SelectItem key={carrier.id} value={carrier.id.toString()}>
                {carrier.commercial_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="producto">Product *</Label>
        <Select
          value={formData.producto_id?.toString()}
          onValueChange={(value) => setFormData({ ...formData, producto_id: parseInt(value) })}
          disabled={!formData.carrier_id}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {productos.map((producto: any) => (
              <SelectItem key={producto.id} value={producto.id.toString()}>
                {producto.codigo_producto} - {producto.nombre_producto}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.start_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.start_date ? format(formData.start_date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.start_date}
                onSelect={(date) => setFormData({ ...formData, start_date: date })}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>End Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.end_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.end_date ? format(formData.end_date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.end_date}
                onSelect={(date) => setFormData({ ...formData, end_date: date })}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="total_events">Total Events (Annual) *</Label>
        <Input
          id="total_events"
          type="number"
          min="1"
          value={formData.total_events || ''}
          onChange={(e) => setFormData({ ...formData, total_events: parseInt(e.target.value) || 0 })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_events_per_week">
          Max Events per Panelist/Week (Default: {defaultMaxEvents})
        </Label>
        <Input
          id="max_events_per_week"
          type="number"
          min="1"
          value={formData.max_events_per_week || ''}
          onChange={(e) => setFormData({ ...formData, max_events_per_week: parseInt(e.target.value) || 1 })}
        />
      </div>

      <div className="space-y-2">
        <Label>Merge Strategy *</Label>
        <RadioGroup
          value={formData.merge_strategy}
          onValueChange={(value: 'append' | 'replace') => setFormData({ ...formData, merge_strategy: value })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="append" id="append" />
            <Label htmlFor="append" className="font-normal cursor-pointer">
              Append - Add to existing events
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="replace" id="replace" />
            <Label htmlFor="replace" className="font-normal cursor-pointer">
              Replace - Delete existing PENDING events for this carrier/product and add new ones
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit} className="flex-1">
          Preview Plan
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
