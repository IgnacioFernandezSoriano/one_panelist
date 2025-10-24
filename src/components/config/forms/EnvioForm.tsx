import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EnvioFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function EnvioForm({ onSuccess, onCancel, initialData }: EnvioFormProps) {
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
    motivo_creacion: initialData?.motivo_creacion || "",
    estado: initialData?.estado || "PENDIENTE",
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
      .select("id, carrier_code, legal_name, commercial_name")
      .eq("status", "active")
      .order("carrier_code");

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
        title: "Error",
        description: "La fecha programada es obligatoria",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const selectedProducto = productos.find(p => p.id.toString() === formData.producto_id);
    
    const dataToSave = {
      ...formData,
      fecha_programada: format(fechaProgramada, "yyyy-MM-dd"),
      cliente_id: parseInt(formData.cliente_id),
      producto_id: formData.producto_id ? parseInt(formData.producto_id) : null,
      tipo_producto: selectedProducto ? `${selectedProducto.codigo_producto} - ${selectedProducto.nombre_producto}` : null,
      carrier_id: formData.carrier_id ? parseInt(formData.carrier_id) : null,
      carrier_name: formData.carrier_id ? carriers.find(c => c.id.toString() === formData.carrier_id)?.commercial_name || carriers.find(c => c.id.toString() === formData.carrier_id)?.legal_name : null,
    };

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
        title: isEditing ? "Allocation Plan actualizado" : "Allocation Plan creado",
        description: "Los cambios se guardaron correctamente",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
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
          <Label htmlFor="cliente">Account *</Label>
          <Popover open={openCliente} onOpenChange={setOpenCliente}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCliente}
                className="w-full justify-between"
              >
                {selectedCliente ? `${selectedCliente.codigo} - ${selectedCliente.nombre}` : "Seleccionar cuenta..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Buscar cuenta..." />
                <CommandEmpty>No se encontró la cuenta.</CommandEmpty>
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
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Carrier */}
        <div className="space-y-2">
          <Label htmlFor="carrier">Carrier</Label>
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
                      return carrier ? `${carrier.carrier_code} - ${carrier.commercial_name || carrier.legal_name}` : "Seleccionar carrier...";
                    })()
                  : "Seleccionar carrier..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Buscar carrier..." />
                <CommandEmpty>No se encontró el carrier.</CommandEmpty>
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
                    (Ninguno)
                  </CommandItem>
                  {carriers.map((carrier) => (
                    <CommandItem
                      key={carrier.id}
                      value={`${carrier.carrier_code} ${carrier.commercial_name || carrier.legal_name}`}
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
                      {carrier.carrier_code} - {carrier.commercial_name || carrier.legal_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Fecha Programada */}
        <div className="space-y-2">
          <Label>Fecha Programada *</Label>
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
                {fechaProgramada ? format(fechaProgramada, "dd/MM/yyyy") : "Seleccionar fecha"}
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
          <Label htmlFor="nodo_origen">Nodo Origen *</Label>
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
                  : "Seleccionar nodo..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Buscar nodo..." />
                <CommandEmpty>No se encontró el nodo.</CommandEmpty>
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
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Nodo Destino */}
        <div className="space-y-2">
          <Label htmlFor="nodo_destino">Nodo Destino *</Label>
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
                  : "Seleccionar nodo..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Buscar nodo..." />
                <CommandEmpty>No se encontró el nodo.</CommandEmpty>
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
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Tipo de Producto */}
        <div className="space-y-2">
          <Label htmlFor="producto_id">Product Type *</Label>
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
                    ? "Seleccionar producto..." 
                    : "Primero seleccione una cuenta..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Buscar producto..." />
                <CommandEmpty>No se encontró el producto.</CommandEmpty>
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
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Motivo de Creación */}
        <div className="space-y-2">
          <Label htmlFor="motivo_creacion">Motivo de Creación *</Label>
          <Input
            id="motivo_creacion"
            value={formData.motivo_creacion}
            onChange={(e) => setFormData({ ...formData, motivo_creacion: e.target.value })}
            placeholder="Ej: Inicial, Reposición"
            required
          />
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <Label htmlFor="estado">Estado *</Label>
          <Select
            value={formData.estado}
            onValueChange={(value) => setFormData({ ...formData, estado: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              <SelectItem value="NOTIFICADO">Notificado</SelectItem>
              <SelectItem value="ENVIADO">Enviado</SelectItem>
              <SelectItem value="RECIBIDO">Recibido</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Observaciones */}
      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Input
          id="observaciones"
          value={formData.observaciones}
          onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
          placeholder="Notas adicionales (opcional)"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
