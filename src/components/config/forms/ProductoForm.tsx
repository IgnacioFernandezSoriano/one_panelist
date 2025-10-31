import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useUserRole } from "@/hooks/useUserRole";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CarrierProductSelector } from "./CarrierProductSelector";

interface ProductoFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export const ProductoForm = ({ onSuccess, onCancel, initialData }: ProductoFormProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    cliente_id: initialData?.cliente_id || "",
    nombre_producto: initialData?.nombre_producto || "",
    descripcion: initialData?.descripcion || "",
    standard_delivery_hours: initialData?.standard_delivery_hours?.toString() || "",
    estado: initialData?.estado || "activo",
  });

  const [clientes, setClientes] = useState<any[]>([]);
  const [tiposMaterial, setTiposMaterial] = useState<any[]>([]);
  const [materialesProducto, setMaterialesProducto] = useState<any[]>([]);
  const [selectedCarriers, setSelectedCarriers] = useState<number[]>([]);
  const [openCliente, setOpenCliente] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { clienteId, isSuperAdmin } = useUserRole();

  useEffect(() => {
    if (clienteId !== null) {
      loadClientes();
      loadTiposMaterial();
      if (initialData?.id) {
        loadMaterialesProducto(initialData.id);
        loadCarriers(initialData.id);
      }
    }
  }, [clienteId, initialData?.id]);

  const loadClientes = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("id, codigo, nombre")
      .eq("estado", "activo")
      .order("nombre");
    setClientes(data || []);
  };

  const loadTiposMaterial = async () => {
    if (!clienteId) return;
    
    let query = supabase
      .from("tipos_material")
      .select("*")
      .eq("estado", "activo");
    
    // Filter by user's cliente_id unless superadmin
    if (!isSuperAdmin()) {
      query = query.eq("cliente_id", clienteId);
    }
    
    const { data } = await query.order("nombre");
    setTiposMaterial(data || []);
  };

  const loadCarriers = async (productoId: number) => {
    try {
      const { data, error } = await supabase
        .from('carrier_productos' as any)
        .select('carrier_id')
        .eq('producto_id', productoId);
      
      if (error) throw error;
      setSelectedCarriers((data || []).map((item: any) => item.carrier_id));
    } catch (error) {
      console.error("Error loading carriers:", error);
    }
  };

  const loadMaterialesProducto = async (productoId: number) => {
    const { data } = await supabase
      .from("producto_materiales")
      .select(`
        *,
        tipos_material (
          id,
          codigo,
          nombre,
          unidad_medida
        )
      `)
      .eq("producto_id", productoId);
    setMaterialesProducto(data || []);
  };

  const handleAddMaterial = () => {
    if (tiposMaterial.length === 0) return;
    
    const firstMaterial = tiposMaterial[0];
    setMaterialesProducto([
      ...materialesProducto,
      {
        tipo_material_id: firstMaterial.id,
        cantidad: 1,
        es_obligatorio: true,
        notas: "",
        tipos_material: firstMaterial,
      },
    ]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterialesProducto(materialesProducto.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: string, value: any) => {
    const updated = [...materialesProducto];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === "tipo_material_id") {
      const selectedMaterial = tiposMaterial.find(m => m.id === parseInt(value));
      if (selectedMaterial) {
        updated[index].tipos_material = selectedMaterial;
      }
    }
    
    setMaterialesProducto(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const dataToSave = {
        cliente_id: parseInt(formData.cliente_id),
        nombre_producto: formData.nombre_producto,
        descripcion: formData.descripcion || null,
        standard_delivery_hours: formData.standard_delivery_hours ? parseInt(formData.standard_delivery_hours) : null,
        estado: formData.estado,
      };

      const isEditing = !!initialData?.id;
      let productoId = initialData?.id;

      if (isEditing) {
        const { error } = await supabase
          .from("productos_cliente")
          .update(dataToSave)
          .eq("id", initialData.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("productos_cliente")
          .insert([dataToSave] as any)
          .select()
          .single();

        if (error) throw error;
        productoId = data.id;
      }

      // Save carrier relationships
      if (productoId) {
        // Delete existing relationships
        await supabase
          .from('carrier_productos' as any)
          .delete()
          .eq('producto_id', productoId);
        
        // Insert new relationships
        if (selectedCarriers.length > 0) {
          const relationships = selectedCarriers.map(carrierId => ({
            cliente_id: parseInt(formData.cliente_id),
            carrier_id: carrierId,
            producto_id: productoId,
          }));
          
          await supabase
            .from('carrier_productos' as any)
            .insert(relationships);
        }

        // Delete existing materials if editing
        if (isEditing) {
          await supabase
            .from("producto_materiales")
            .delete()
            .eq("producto_id", productoId);
        }

        // Insert new materials
        if (materialesProducto.length > 0) {
          const materialesData = materialesProducto.map(m => ({
            producto_id: productoId,
            tipo_material_id: m.tipo_material_id,
            cantidad: m.cantidad,
            es_obligatorio: m.es_obligatorio,
            notas: m.notas || null,
          }));

          const { error: materialesError } = await supabase
            .from("producto_materiales")
            .insert(materialesData);

          if (materialesError) throw materialesError;
        }
      }

      toast({
        title: isEditing ? "Product updated" : "Product created",
        description: "The product has been saved successfully",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCliente = clientes.find(c => c.id === parseInt(formData.cliente_id));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cliente_id">{t('label.account')} *</Label>
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
              <CommandInput placeholder={t('form.select_account')} />
              <CommandList>
                <CommandEmpty>No account found.</CommandEmpty>
                <CommandGroup>
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
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Product Code</Label>
        <Input
          value={initialData?.codigo_producto || "Auto-generated"}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Code will be auto-generated (3 digits)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nombre_producto">Product Name *</Label>
        <Input
          id="nombre_producto"
          value={formData.nombre_producto}
          onChange={(e) => setFormData({ ...formData, nombre_producto: e.target.value })}
          required
          maxLength={255}
        />
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
        <Label htmlFor="standard_delivery_hours">Standard Delivery Time (hours)</Label>
        <Input
          id="standard_delivery_hours"
          type="number"
          min="1"
          value={formData.standard_delivery_hours}
          onChange={(e) => setFormData({ ...formData, standard_delivery_hours: e.target.value })}
          placeholder="e.g., 72"
        />
        <p className="text-xs text-muted-foreground">
          Expected delivery time for this product type. Used to trigger receiver verification requests.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="estado">Status *</Label>
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

      {/* Carrier Assignment Section */}
      {formData.cliente_id && (
        <div className="space-y-2 pt-4 border-t">
          <Label>Assigned Carriers</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Select which carriers can handle this product
          </p>
          <CarrierProductSelector
            clienteId={parseInt(formData.cliente_id)}
            selectedCarrierIds={selectedCarriers}
            onChange={setSelectedCarriers}
          />
        </div>
      )}

      {/* Required Materials Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex justify-between items-center">
          <div>
            <Label className="text-base">Required Materials</Label>
            <p className="text-xs text-muted-foreground">
              Materials needed for each shipment of this product
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddMaterial}
            disabled={tiposMaterial.length === 0}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Material
          </Button>
        </div>

        {materialesProducto.length > 0 && (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("product.material_type_label")}</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialesProducto.map((material, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={material.tipo_material_id?.toString()}
                        onValueChange={(value) => handleMaterialChange(index, "tipo_material_id", parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposMaterial.map((tipo) => (
                            <SelectItem key={tipo.id} value={tipo.id.toString()}>
                              {tipo.codigo} - {tipo.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={material.cantidad}
                        onChange={(e) => handleMaterialChange(index, "cantidad", parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={material.es_obligatorio}
                        onCheckedChange={(checked) => handleMaterialChange(index, "es_obligatorio", checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={material.notas || ""}
                        onChange={(e) => handleMaterialChange(index, "notas", e.target.value)}
                        placeholder="Optional notes"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMaterial(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {materialesProducto.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
            No materials added. Click "Add Material" to specify required materials for this product.
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? "Saving..." : initialData ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};
