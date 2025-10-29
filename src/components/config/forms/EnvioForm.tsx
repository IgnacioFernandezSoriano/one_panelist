import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandSeparator } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { QuickCreateCliente } from "./quick-create/QuickCreateCliente";
import { QuickCreateCarrier } from "./quick-create/QuickCreateCarrier";
import { QuickCreateNodo } from "./quick-create/QuickCreateNodo";
import { QuickCreateProducto } from "./quick-create/QuickCreateProducto";

interface EnvioFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function EnvioForm({ onSuccess, onCancel, initialData }: EnvioFormProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [nodos, setNodos] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [openCliente, setOpenCliente] = useState(false);
  const [openNodoOrigen, setOpenNodoOrigen] = useState(false);
  const [openNodoDestino, setOpenNodoDestino] = useState(false);
  const [openCarrier, setOpenCarrier] = useState(false);
  const [openProducto, setOpenProducto] = useState(false);
  const [showQuickCreateCliente, setShowQuickCreateCliente] = useState(false);
  const [showQuickCreateCarrier, setShowQuickCreateCarrier] = useState(false);
  const [showQuickCreateNodoOrigen, setShowQuickCreateNodoOrigen] = useState(false);
  const [showQuickCreateNodoDestino, setShowQuickCreateNodoDestino] = useState(false);
  const [showQuickCreateProducto, setShowQuickCreateProducto] = useState(false);
  const [fechaProgramada, setFechaProgramada] = useState<Date | undefined>(
    initialData?.fecha_programada ? new Date(initialData.fecha_programada) : undefined
  );
  
  const [formData, setFormData] = useState({
    cliente_id: initialData?.cliente_id || "",
    carrier_id: initialData?.carrier_id || "",
    nodo_origen: initialData?.nodo_origen || "",
    nodo_destino: initialData?.nodo_destino || "",
    producto_id: initialData?.producto_id || "",
    tipo_producto: initialData?.tipo_producto || "",
    motivo_creacion: initialData?.motivo_creacion || "programado",
    estado: initialData?.estado || "PENDING",
    observaciones: initialData?.observaciones || "",
  });

  const { toast } = useToast();
  const isEditing = !!initialData;

  useEffect(() => {
    loadClientes();
    loadNodos();
    loadCarriers();
  }, []);

  useEffect(() => {
    if (formData.cliente_id) {
      loadProductos(parseInt(formData.cliente_id));
    } else {
      setProductos([]);
    }
  }, [formData.cliente_id]);

  const loadClientes = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, codigo")
      .eq("estado", "activo")
      .order("nombre");

    if (!error && data) {
      setClientes(data);
    }
  };

  const loadNodos = async () => {
    const { data, error } = await supabase
      .from("nodos")
      .select("codigo, ciudad, pais")
      .eq("estado", "activo")
      .order("codigo");

    if (!error && data) {
      setNodos(data);
    }
  };

  const loadCarriers = async () => {
    const { data, error } = await supabase
      .from("carriers")
      .select("id, legal_name, commercial_name")
      .eq("status", "active")
      .order("legal_name");

    if (!error && data) {
      setCarriers(data);
    }
  };

  const loadProductos = async (clienteId: number) => {
    const { data, error } = await supabase
      .from("productos_cliente")
      .select("id, codigo_producto, nombre_producto")
      .eq("cliente_id", clienteId)
      .eq("estado", "activo")
      .order("nombre_producto");

    if (!error && data) {
      setProductos(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!fechaProgramada) {
      toast({
        title: t('common.error'),
        description: t('error.scheduled_date_required'),
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    if (!formData.cliente_id || formData.cliente_id === "") {
      toast({
        title: t('common.error'),
        description: t('error.account_required'),
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const selectedProducto = productos.find(p => p.id.toString() === formData.producto_id);
    
    const dataToSave = {
      ...formData,
      fecha_programada: format(fechaProgramada, "yyyy-MM-dd"),
      cliente_id: formData.cliente_id && formData.cliente_id !== "" ? parseInt(formData.cliente_id) : null,
      producto_id: formData.producto_id && formData.producto_id !== "" ? parseInt(formData.producto_id) : null,
      tipo_producto: selectedProducto ? `${selectedProducto.codigo_producto} - ${selectedProducto.nombre_producto}` : null,
      carrier_id: formData.carrier_id && formData.carrier_id !== "" ? parseInt(formData.carrier_id) : null,
      carrier_name: formData.carrier_id ? carriers.find(c => c.id.toString() === formData.carrier_id)?.commercial_name || carriers.find(c => c.id.toString() === formData.carrier_id)?.legal_name : null,
    };

    if (!dataToSave.cliente_id) {
      toast({
        title: t('common.error'),
        description: t('error.account_required'),
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      let result;
      if (isEditing) {
        result = await supabase
          .from("envios")
          .update(dataToSave)
          .eq("id", initialData.id);
      } else {
        result = await supabase
          .from("envios")
          .insert([dataToSave]);
      }

      if (result.error) throw result.error;

      toast({
        title: isEditing ? t('success.allocation_plan_updated') : t('success.allocation_plan_created'),
        description: t('success.changes_saved'),
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCliente = clientes.find(c => c.id.toString() === formData.cliente_id);
  const selectedNodoOrigen = nodos.find(n => n.codigo === formData.nodo_origen);
  const selectedNodoDestino = nodos.find(n => n.codigo === formData.nodo_destino);
  const selectedProducto = productos.find(p => p.id.toString() === formData.producto_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cliente */}
        <div className="space-y-2">
          <Label htmlFor="cliente">{t('label.account')} *</Label>
          <Popover open={openCliente} onOpenChange={setOpenCliente}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCliente}
                className="w-full justify-between"
              >
                {selectedCliente ? `${selectedCliente.codigo} - ${selectedCliente.nombre}` : t('form.select_account')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder={t('form.search_account')} />
                <CommandEmpty>{t('form.account_not_found')}</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {clientes.map((cliente) => (
                    <CommandItem
                      key={cliente.id}
                      value={`${cliente.codigo} ${cliente.nombre}`}
                      onSelect={() => {
                        setFormData({ ...formData, cliente_id: cliente.id.toString() });
                        setOpenCliente(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.cliente_id === cliente.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {cliente.codigo} - {cliente.nombre}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpenCliente(false);
                      setShowQuickCreateCliente(true);
                    }}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('form.create_new_account')}
                  </CommandItem>
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Carrier */}
        <div className="space-y-2">
          <Label htmlFor="carrier">{t('form.carrier')}</Label>
          <Popover open={openCarrier} onOpenChange={setOpenCarrier}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCarrier}
                className="w-full justify-between"
              >
                {formData.carrier_id 
                  ? (() => {
                      const carrier = carriers.find(c => c.id.toString() === formData.carrier_id);
                      return carrier ? `${carrier.commercial_name || carrier.legal_name}` : t('form.select_carrier');
                    })()
                  : t('form.select_carrier')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder={t('form.search_carrier')} />
                <CommandEmpty>{t('form.carrier_not_found')}</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  <CommandItem
                    value=""
                    onSelect={() => {
                      setFormData({ ...formData, carrier_id: "" });
                      setOpenCarrier(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !formData.carrier_id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {t('form.none')}
                  </CommandItem>
                  {carriers.map((carrier) => (
                    <CommandItem
                      key={carrier.id}
                      value={`${carrier.commercial_name || carrier.legal_name}`}
                      onSelect={() => {
                        setFormData({ ...formData, carrier_id: carrier.id.toString() });
                        setOpenCarrier(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.carrier_id === carrier.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {carrier.commercial_name || carrier.legal_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpenCarrier(false);
                      setShowQuickCreateCarrier(true);
                    }}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('form.create_new_carrier')}
                  </CommandItem>
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Fecha Programada */}
        <div className="space-y-2">
          <Label>{t('form.scheduled_date')} *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !fechaProgramada && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fechaProgramada ? format(fechaProgramada, "dd/MM/yyyy") : t('form.select_date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={fechaProgramada}
                onSelect={setFechaProgramada}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Nodo Origen */}
        <div className="space-y-2">
          <Label htmlFor="nodo_origen">{t('form.origin_node')} *</Label>
          <Popover open={openNodoOrigen} onOpenChange={setOpenNodoOrigen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openNodoOrigen}
                className="w-full justify-between"
              >
                {selectedNodoOrigen 
                  ? `${selectedNodoOrigen.codigo} - ${selectedNodoOrigen.ciudad}` 
                  : t('form.select_node')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder={t('form.search_node')} />
                <CommandEmpty>{t('form.node_not_found')}</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {nodos.map((nodo) => (
                    <CommandItem
                      key={nodo.codigo}
                      value={`${nodo.codigo} ${nodo.ciudad}`}
                      onSelect={() => {
                        setFormData({ ...formData, nodo_origen: nodo.codigo });
                        setOpenNodoOrigen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.nodo_origen === nodo.codigo ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {nodo.codigo} - {nodo.ciudad}, {nodo.pais}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpenNodoOrigen(false);
                      setShowQuickCreateNodoOrigen(true);
                    }}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('form.create_new_node')}
                  </CommandItem>
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Nodo Destino */}
        <div className="space-y-2">
          <Label htmlFor="nodo_destino">{t('form.destination_node')} *</Label>
          <Popover open={openNodoDestino} onOpenChange={setOpenNodoDestino}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openNodoDestino}
                className="w-full justify-between"
              >
                {selectedNodoDestino 
                  ? `${selectedNodoDestino.codigo} - ${selectedNodoDestino.ciudad}` 
                  : t('form.select_node')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder={t('form.search_node')} />
                <CommandEmpty>{t('form.node_not_found')}</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {nodos.map((nodo) => (
                    <CommandItem
                      key={nodo.codigo}
                      value={`${nodo.codigo} ${nodo.ciudad}`}
                      onSelect={() => {
                        setFormData({ ...formData, nodo_destino: nodo.codigo });
                        setOpenNodoDestino(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.nodo_destino === nodo.codigo ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {nodo.codigo} - {nodo.ciudad}, {nodo.pais}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpenNodoDestino(false);
                      setShowQuickCreateNodoDestino(true);
                    }}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('form.create_new_node')}
                  </CommandItem>
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Tipo de Producto */}
        <div className="space-y-2">
          <Label htmlFor="producto_id">{t('form.product_type')} *</Label>
          <Popover open={openProducto} onOpenChange={setOpenProducto}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openProducto}
                className="w-full justify-between"
                disabled={!formData.cliente_id}
              >
                {selectedProducto 
                  ? `${selectedProducto.codigo_producto} - ${selectedProducto.nombre_producto}` 
                  : formData.cliente_id 
                    ? t('form.select_product') 
                    : t('form.first_select_account')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder={t('form.search_product')} />
                <CommandEmpty>{t('form.product_not_found')}</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {productos.map((producto) => (
                    <CommandItem
                      key={producto.id}
                      value={`${producto.codigo_producto} ${producto.nombre_producto}`}
                      onSelect={() => {
                        setFormData({ ...formData, producto_id: producto.id.toString() });
                        setOpenProducto(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.producto_id === producto.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {producto.codigo_producto} - {producto.nombre_producto}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {formData.cliente_id && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setOpenProducto(false);
                          setShowQuickCreateProducto(true);
                        }}
                        className="text-primary"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {t('form.create_new_product')}
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Motivo de Creación */}
        <div className="space-y-2">
          <Label htmlFor="motivo_creacion">{t('form.creation_reason')} *</Label>
          <Select
            value={formData.motivo_creacion}
            onValueChange={(value) => setFormData({ ...formData, motivo_creacion: value })}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="programado">{t('creation_reason.programado')}</SelectItem>
              <SelectItem value="compensatorio_extravio">{t('creation_reason.compensatory_loss')}</SelectItem>
              <SelectItem value="compensatorio_no_disponible">{t('creation_reason.compensatory_unavailable')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <Label htmlFor="estado">{t('form.status')} *</Label>
          <Select
            value={formData.estado}
            onValueChange={(value) => setFormData({ ...formData, estado: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">{t('status.pending')}</SelectItem>
              <SelectItem value="NOTIFIED">{t('status.notified')}</SelectItem>
              <SelectItem value="SENT">{t('status.sent')}</SelectItem>
              <SelectItem value="RECEIVED">{t('status.received')}</SelectItem>
              <SelectItem value="CANCELLED">{t('status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Observaciones */}
      <div className="space-y-2">
        <Label htmlFor="observaciones">{t('form.notes')}</Label>
        <Input
          id="observaciones"
          value={formData.observaciones}
          onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
          placeholder={t('form.notes_placeholder')}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('button.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('button.saving') : isEditing ? t('button.update') : t('button.create')}
        </Button>
      </div>

      {/* Quick Create Dialogs */}
      <QuickCreateCliente 
        open={showQuickCreateCliente}
        onOpenChange={setShowQuickCreateCliente}
        onSuccess={(newCliente) => {
          setClientes([...clientes, newCliente]);
          setFormData({ ...formData, cliente_id: newCliente.id.toString() });
        }}
      />
      
      <QuickCreateCarrier 
        open={showQuickCreateCarrier}
        onOpenChange={setShowQuickCreateCarrier}
        onSuccess={(newCarrier) => {
          setCarriers([...carriers, newCarrier]);
          setFormData({ ...formData, carrier_id: newCarrier.id.toString() });
        }}
      />
      
      <QuickCreateNodo 
        open={showQuickCreateNodoOrigen}
        onOpenChange={setShowQuickCreateNodoOrigen}
        onSuccess={(newNodo) => {
          setNodos([...nodos, newNodo]);
          setFormData({ ...formData, nodo_origen: newNodo.codigo });
        }}
      />
      
      <QuickCreateNodo 
        open={showQuickCreateNodoDestino}
        onOpenChange={setShowQuickCreateNodoDestino}
        onSuccess={(newNodo) => {
          setNodos([...nodos, newNodo]);
          setFormData({ ...formData, nodo_destino: newNodo.codigo });
        }}
      />
      
      {formData.cliente_id && (
        <QuickCreateProducto 
          open={showQuickCreateProducto}
          onOpenChange={setShowQuickCreateProducto}
          clienteId={parseInt(formData.cliente_id)}
          onSuccess={(newProducto) => {
            setProductos([...productos, newProducto]);
            setFormData({ ...formData, producto_id: newProducto.id.toString() });
          }}
        />
      )}
    </form>
  );
}
