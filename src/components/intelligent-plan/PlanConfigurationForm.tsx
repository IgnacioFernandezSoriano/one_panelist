import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { CalendarIcon, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useCliente } from "@/contexts/ClienteContext";
import { ClassificationAllocationTable } from "./ClassificationAllocationTable";
import { ProductSeasonalityTableVertical } from "./ProductSeasonalityTableVertical";

export interface PlanConfiguration {
  cliente_id: number;
  carrier_id: number;
  producto_id: number;
  start_date: Date;
  end_date: Date;
  total_events: number;
  max_events_per_week: number;
  merge_strategy: 'add' | 'replace';
  plan_name?: string; // Optional custom plan name
}

interface PlanConfigurationFormProps {
  initialConfig?: Partial<PlanConfiguration>;
  onSubmit: (config: PlanConfiguration) => void;
  onCancel: () => void;
}

export function PlanConfigurationForm({ initialConfig, onSubmit, onCancel }: PlanConfigurationFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { clienteId } = useCliente(); // Get cliente_id from global context
  const [clientes, setClientes] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [defaultMaxEvents, setDefaultMaxEvents] = useState(5);
  
  const [formData, setFormData] = useState<Partial<PlanConfiguration>>({
    merge_strategy: 'add',
    max_events_per_week: 5,
    ...initialConfig,
  });

  useEffect(() => {
    initializeForm();
  }, []);

  // Sync clienteId from context to formData
  useEffect(() => {
    if (clienteId && clienteId !== formData.cliente_id) {
      console.log('[PlanConfigForm] Syncing clienteId from context:', clienteId);
      setFormData(prev => ({ ...prev, cliente_id: clienteId }));
    }
  }, [clienteId]);

  useEffect(() => {
    if (formData.cliente_id) {
      console.log('[PlanConfigForm] Loading carriers for cliente_id:', formData.cliente_id);
      loadCarriers(formData.cliente_id);
      loadDefaultMaxEvents(formData.cliente_id);
    }
  }, [formData.cliente_id]);

  useEffect(() => {
    if (formData.carrier_id && formData.cliente_id) {
      loadProductos(formData.carrier_id, formData.cliente_id);
    }
  }, [formData.carrier_id, formData.cliente_id]);

  const handleClassificationMatrixChange = (data: any) => {
    console.log('Classification matrix changed:', data);
  };

  const initializeForm = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ✅ Obtener el usuario de la tabla 'usuarios' usando el email
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, cliente_id')
        .eq('email', user.email)
        .maybeSingle();
      
      if (userError || !userData) {
        console.error("Error loading user data:", userError);
        return;
      }

      const userId = userData.id; // ✅ Este es un integer, no UUID

      // Check if user is superadmin via user_roles table
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'superadmin')
        .maybeSingle();

      const isSuperAdmin = !!roleData;
      setIsSuperAdmin(isSuperAdmin);

      if (isSuperAdmin) {
        // Cargar lista de clientes
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nombre')
          .eq('estado', 'activo')
          .order('nombre');
        setClientes(clientesData || []);
      }
      // Note: clienteId sync and carrier loading is handled by useEffect hooks

      console.log('[PlanConfigForm] Initialized:', {
        isSuperAdmin,
        userId: userData.id,
        contextClienteId: clienteId
      });
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
        .maybeSingle();
      
      if (data && (data as any).max_events_per_panelist_week) {
        const maxEvents = (data as any).max_events_per_panelist_week || 5;
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
        .eq('status', 'active')
        .order('commercial_name');

      if (error) throw error;
      setCarriers(data || []);
      console.log('[PlanConfigForm] Loaded carriers:', data?.length || 0);
    } catch (error) {
      console.error("Error loading carriers:", error);
    }
  };

  const loadProductos = async (carrierId: number, clienteId: number) => {
    try {
      // Primero obtener los IDs de productos asociados al carrier
      const { data: carrierProductsData, error: cpError } = await supabase
        .from('carrier_productos')
        .select('producto_id')
        .eq('carrier_id', carrierId)
        .eq('cliente_id', clienteId);

      if (cpError) throw cpError;
      
      if (!carrierProductsData || carrierProductsData.length === 0) {
        setProductos([]);
        console.log('[PlanConfigForm] No products found for carrier');
        return;
      }

      // Extraer los IDs de productos
      const productIds = carrierProductsData.map((cp: any) => cp.producto_id);

      // Obtener los detalles de los productos
      const { data: productosData, error: pError } = await supabase
        .from('productos_cliente')
        .select('id, nombre_producto, codigo_producto')
        .in('id', productIds)
        .eq('estado', 'activo')
        .order('nombre_producto');

      if (pError) throw pError;
      setProductos(productosData || []);
      console.log('[PlanConfigForm] Loaded products:', productosData?.length || 0);
    } catch (error) {
      console.error("Error loading productos:", error);
      toast({
        title: "Error",
        description: "Failed to load products for this carrier",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.cliente_id || !formData.carrier_id || !formData.producto_id ||
        !formData.start_date || !formData.end_date || !formData.total_events ||
        !formData.max_events_per_week || !formData.merge_strategy) {
      toast({
        title: t('intelligent_plan.validation_error'),
        description: t('intelligent_plan.fill_required'),
        variant: "destructive",
      });
      return;
    }

    if (!formData.max_events_per_week || formData.max_events_per_week < 1) {
      toast({
        title: t('intelligent_plan.validation_error'),
        description: 'Max events per week must be at least 1',
        variant: "destructive",
      });
      return;
    }

    if (formData.end_date <= formData.start_date) {
      toast({
        title: t('intelligent_plan.validation_error'),
        description: t('intelligent_plan.end_after_start'),
        variant: "destructive",
      });
      return;
    }

    if (formData.total_events <= 0) {
      toast({
        title: t('intelligent_plan.validation_error'),
        description: t('intelligent_plan.events_positive'),
        variant: "destructive",
      });
      return;
    }

    onSubmit(formData as PlanConfiguration);
  };

  return (
    <div className="space-y-6">
      {/* Account selector removed - using global account selector from header */}

      <div className="space-y-2">
        <Label htmlFor="plan_name">Plan Name (optional)</Label>
        <Input
          id="plan_name"
          type="text"
          placeholder="e.g., Q1 2025 Expansion Plan"
          value={formData.plan_name || ''}
          onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
        />
        <p className="text-sm text-muted-foreground">
          If not provided, a name will be generated automatically based on dates
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="carrier">{t('intelligent_plan.carrier')} *</Label>
        <Select
          value={formData.carrier_id?.toString()}
          onValueChange={(value) => setFormData({ ...formData, carrier_id: parseInt(value), producto_id: undefined })}
          disabled={!formData.cliente_id}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('intelligent_plan.select_carrier')} />
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
        <Label htmlFor="producto">{t('intelligent_plan.product')} *</Label>
        <Select
          value={formData.producto_id?.toString()}
          onValueChange={(value) => setFormData({ ...formData, producto_id: parseInt(value) })}
          disabled={!formData.carrier_id}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('intelligent_plan.select_product')} />
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
          <Label>{t('intelligent_plan.start_date')} *</Label>
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
                {formData.start_date ? format(formData.start_date, "PPP") : t('intelligent_plan.pick_date')}
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
          <Label>{t('intelligent_plan.end_date')} *</Label>
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
                {formData.end_date ? format(formData.end_date, "PPP") : t('intelligent_plan.pick_date')}
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
        <Label htmlFor="total_events">{t('intelligent_plan.total_events')} *</Label>
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
          {t('intelligent_plan.max_events_per_week').replace('{value}', defaultMaxEvents.toString())}
        </Label>
        <Input
          id="max_events_per_week"
          type="number"
          min="1"
          value={formData.max_events_per_week ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            setFormData({ 
              ...formData, 
              max_events_per_week: value === '' ? undefined : parseInt(value) 
            });
          }}
        />
        {formData.max_events_per_week && formData.max_events_per_week < 3 && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Warning: Value too low. With {formData.max_events_per_week} events/week, each node can only handle {formData.max_events_per_week * 4} events/month. 
              This may result in many unassigned events. Recommended minimum: 3 events/week (12/month).
            </AlertDescription>
          </Alert>
        )}
        {formData.max_events_per_week && formData.max_events_per_week >= 3 && formData.max_events_per_week < 5 && (
          <Alert className="mt-2">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Capacity: {formData.max_events_per_week * 4} events/month/node. 
              Standard recommended: 5 events/week (20/month) for better distribution.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Classification Allocation Matrix */}
      {formData.cliente_id && (
        <div className="space-y-2">
          <ClassificationAllocationTable 
            clienteId={formData.cliente_id}
            onChange={handleClassificationMatrixChange}
          />
        </div>
      )}

          {/* Product Seasonality Table */}
          {formData.cliente_id && !formData.producto_id && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t('intelligent_plan.seasonality_after_product_selection')}
              </AlertDescription>
            </Alert>
          )}
          
          {formData.cliente_id && formData.producto_id && (
            <div className="space-y-2">
              <ProductSeasonalityTableVertical
                clienteId={formData.cliente_id}
                productoId={formData.producto_id}
                year={formData.start_date ? formData.start_date.getFullYear() : new Date().getFullYear()}
                onChange={(data) => {
                  console.log('Seasonality updated:', data);
                }}
              />
            </div>
          )}

      <div className="space-y-2">
        <Label>{t('intelligent_plan.merge_strategy')} *</Label>
        <RadioGroup
          value={formData.merge_strategy}
          onValueChange={(value: 'add' | 'replace') => setFormData({ ...formData, merge_strategy: value })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="add" id="add" />
            <Label htmlFor="add" className="font-normal cursor-pointer">
              {t('intelligent_plan.merge_add')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="replace" id="replace" />
            <Label htmlFor="replace" className="font-normal cursor-pointer">
              {t('intelligent_plan.merge_replace')}
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit} className="flex-1">
          {t('intelligent_plan.preview_plan')}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {t('action.cancel')}
        </Button>
      </div>
    </div>
  );
}
