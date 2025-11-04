import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Save, X } from "lucide-react";

interface ValidationError {
  codigo: string;
  severidad: 'critical' | 'warning' | 'info';
  campo: string;
  descripcion: string;
  detalle: string;
}

interface QuickFixValidationFormProps {
  envio: any;
  validationErrors: ValidationError[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface FieldsToShow {
  showCarrier: boolean;
  showProduct: boolean;
  showFechaEnvio: boolean;
  showFechaRecepcion: boolean;
  showEtiqueta: boolean;
  showNodos: boolean;
  showPanelistas: boolean;
}

export function QuickFixValidationForm({ envio, validationErrors, onSuccess, onCancel }: QuickFixValidationFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [panelistasOpen, setPanelistasOpen] = useState(false);

  // Form state
  const [carrierId, setCarrierId] = useState(envio.carrier_id || "");
  const [productoId, setProductoId] = useState(envio.producto_id || "");
  const [fechaEnvio, setFechaEnvio] = useState(envio.fecha_envio_real || "");
  const [fechaRecepcion, setFechaRecepcion] = useState(envio.fecha_recepcion_real || "");
  const [numeroEtiqueta, setNumeroEtiqueta] = useState(envio.numero_etiqueta || "");
  const [nodoOrigen, setNodoOrigen] = useState(envio.nodo_origen || "");
  const [nodoDestino, setNodoDestino] = useState(envio.nodo_destino || "");
  const [panelistaOrigenId, setPanelistaOrigenId] = useState(envio.panelista_origen_id || "");
  const [panelistaDestinoId, setPanelistaDestinoId] = useState(envio.panelista_destino_id || "");

  // Catalogs
  const [carriers, setCarriers] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [nodos, setNodos] = useState<any[]>([]);
  const [panelistas, setPanelistas] = useState<any[]>([]);

  // Determine which fields to show based on errors
  const fieldsToShow: FieldsToShow = {
    showCarrier: validationErrors.some(e => e.campo === 'carrier_id'),
    showProduct: validationErrors.some(e => e.campo === 'producto_id'),
    showFechaEnvio: validationErrors.some(e => e.campo === 'fecha_envio_real'),
    showFechaRecepcion: validationErrors.some(e => e.campo === 'fecha_recepcion_real'),
    showEtiqueta: validationErrors.some(e => e.campo === 'numero_etiqueta'),
    showNodos: validationErrors.some(e => e.campo === 'nodo_origen' || e.campo === 'nodo_destino'),
    showPanelistas: validationErrors.some(e => e.campo.includes('panelista'))
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  const loadCatalogs = async () => {
    // Load carriers
    if (fieldsToShow.showCarrier) {
      const { data } = await supabase
        .from('carriers')
        .select('id, legal_name')
        .eq('cliente_id', envio.cliente_id)
        .eq('status', 'active')
        .order('legal_name');
      if (data) setCarriers(data);
    }

    // Load products
    if (fieldsToShow.showProduct) {
      const { data } = await supabase
        .from('productos_cliente')
        .select('id, nombre_producto, codigo_producto')
        .eq('cliente_id', envio.cliente_id)
        .eq('estado', 'activo')
        .order('nombre_producto');
      if (data) setProductos(data);
    }

    // Load nodos
    if (fieldsToShow.showNodos) {
      const { data } = await supabase
        .from('nodos')
        .select('id, codigo, nombre_nodo')
        .eq('cliente_id', envio.cliente_id)
        .eq('estado', 'activo')
        .order('codigo');
      if (data) setNodos(data);
    }

    // Load panelistas
    if (fieldsToShow.showPanelistas) {
      const { data } = await supabase
        .from('panelistas')
        .select('id, nombre_completo, codigo_panelista')
        .eq('cliente_id', envio.cliente_id)
        .eq('estado', 'activo')
        .order('nombre_completo');
      if (data) setPanelistas(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate dates
    if (fechaEnvio && fechaRecepcion) {
      const envioDate = new Date(fechaEnvio);
      const recepcionDate = new Date(fechaRecepcion);

      if (recepcionDate <= envioDate) {
        toast({
          title: "Error",
          description: "La fecha de recepción debe ser posterior a la fecha de envío",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Calculate transit time if both dates are present
      let tiempoTransito = null;
      if (fechaEnvio && fechaRecepcion) {
        const envioDate = new Date(fechaEnvio);
        const recepcionDate = new Date(fechaRecepcion);
        const diffTime = Math.abs(recepcionDate.getTime() - envioDate.getTime());
        tiempoTransito = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Update envio with corrected data
      const updateData: any = {};
      
      if (fieldsToShow.showCarrier) updateData.carrier_id = carrierId ? parseInt(carrierId) : null;
      if (fieldsToShow.showProduct) updateData.producto_id = productoId ? parseInt(productoId) : null;
      if (fieldsToShow.showFechaEnvio) updateData.fecha_envio_real = fechaEnvio;
      if (fieldsToShow.showFechaRecepcion) updateData.fecha_recepcion_real = fechaRecepcion;
      if (fieldsToShow.showEtiqueta) updateData.numero_etiqueta = numeroEtiqueta;
      if (fieldsToShow.showNodos) {
        updateData.nodo_origen = nodoOrigen;
        updateData.nodo_destino = nodoDestino;
      }
      if (fieldsToShow.showPanelistas) {
        updateData.panelista_origen_id = panelistaOrigenId ? parseInt(panelistaOrigenId) : null;
        updateData.panelista_destino_id = panelistaDestinoId ? parseInt(panelistaDestinoId) : null;
      }
      if (tiempoTransito !== null) {
        updateData.tiempo_transito_dias = tiempoTransito;
      }

      const { error } = await supabase
        .from('envios')
        .update(updateData)
        .eq('id', envio.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Evento corregido. Re-ejecute la validación para verificar.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 border-t pt-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Carrier */}
        {fieldsToShow.showCarrier && (
          <div className="space-y-2">
            <Label htmlFor="carrier">Carrier *</Label>
            <Select value={carrierId.toString()} onValueChange={setCarrierId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar carrier" />
              </SelectTrigger>
              <SelectContent>
                {carriers.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.legal_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Product */}
        {fieldsToShow.showProduct && (
          <div className="space-y-2">
            <Label htmlFor="producto">Producto *</Label>
            <Select value={productoId.toString()} onValueChange={setProductoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {productos.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.codigo_producto} - {p.nombre_producto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Fecha Envío */}
        {fieldsToShow.showFechaEnvio && (
          <div className="space-y-2">
            <Label htmlFor="fechaEnvio">Fecha de Envío Real *</Label>
            <Input
              id="fechaEnvio"
              type="datetime-local"
              value={fechaEnvio ? new Date(fechaEnvio).toISOString().slice(0, 16) : ""}
              onChange={(e) => setFechaEnvio(e.target.value)}
              required
            />
          </div>
        )}

        {/* Fecha Recepción */}
        {fieldsToShow.showFechaRecepcion && (
          <div className="space-y-2">
            <Label htmlFor="fechaRecepcion">Fecha de Recepción Real *</Label>
            <Input
              id="fechaRecepcion"
              type="datetime-local"
              value={fechaRecepcion ? new Date(fechaRecepcion).toISOString().slice(0, 16) : ""}
              onChange={(e) => setFechaRecepcion(e.target.value)}
              required
            />
          </div>
        )}

        {/* Número Etiqueta */}
        {fieldsToShow.showEtiqueta && (
          <div className="space-y-2 col-span-2">
            <Label htmlFor="etiqueta">Número de Etiqueta *</Label>
            <Input
              id="etiqueta"
              value={numeroEtiqueta}
              onChange={(e) => setNumeroEtiqueta(e.target.value)}
              placeholder="Ingrese el número de seguimiento"
              required
            />
          </div>
        )}

        {/* Nodos */}
        {fieldsToShow.showNodos && (
          <>
            <div className="space-y-2">
              <Label htmlFor="nodoOrigen">Nodo Origen *</Label>
              <Select value={nodoOrigen} onValueChange={setNodoOrigen}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar nodo origen" />
                </SelectTrigger>
                <SelectContent>
                  {nodos.map(n => (
                    <SelectItem key={n.codigo} value={n.codigo}>
                      {n.codigo} - {n.nombre_nodo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nodoDestino">Nodo Destino *</Label>
              <Select value={nodoDestino} onValueChange={setNodoDestino}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar nodo destino" />
                </SelectTrigger>
                <SelectContent>
                  {nodos.map(n => (
                    <SelectItem key={n.codigo} value={n.codigo}>
                      {n.codigo} - {n.nombre_nodo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {/* Panelistas - Collapsible and Optional */}
      {fieldsToShow.showPanelistas && (
        <Collapsible open={panelistasOpen} onOpenChange={setPanelistasOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between">
              <span>Panelistas (Opcional)</span>
              {panelistasOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="panelistaOrigen">Panelista Origen</Label>
                <Select value={panelistaOrigenId.toString() || "none"} onValueChange={(val) => setPanelistaOrigenId(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {panelistas.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.codigo_panelista} - {p.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="panelistaDestino">Panelista Destino</Label>
                <Select value={panelistaDestinoId.toString() || "none"} onValueChange={(val) => setPanelistaDestinoId(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {panelistas.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.codigo_panelista} - {p.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Guardando..." : "Guardar Correcciones"}
        </Button>
      </div>
    </form>
  );
}
