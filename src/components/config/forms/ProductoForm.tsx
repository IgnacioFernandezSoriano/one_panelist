import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

interface ProductoFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export const ProductoForm = ({ onSuccess, onCancel, initialData }: ProductoFormProps) => {
  const [formData, setFormData] = useState({
    cliente_id: initialData?.cliente_id || "",
    codigo_producto: initialData?.codigo_producto || "",
    nombre_producto: initialData?.nombre_producto || "",
    descripcion: initialData?.descripcion || "",
    estado: initialData?.estado || "activo",
  });

  const [clientes, setClientes] = useState<any[]>([]);
  const [openCliente, setOpenCliente] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("id, codigo, nombre")
      .eq("estado", "activo")
      .order("nombre");
    setClientes(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const dataToSave = {
        cliente_id: parseInt(formData.cliente_id),
        codigo_producto: formData.codigo_producto,
        nombre_producto: formData.nombre_producto,
        descripcion: formData.descripcion || null,
        estado: formData.estado,
      };

      const isEditing = !!initialData?.id;

      if (isEditing) {
        const { error } = await supabase
          .from("productos_cliente")
          .update(dataToSave)
          .eq("id", initialData.id);

        if (error) throw error;

        toast({
          title: "Product updated",
          description: "The product has been updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("productos_cliente")
          .insert(dataToSave);

        if (error) throw error;

        toast({
          title: "Product created",
          description: "The product has been created successfully",
        });
      }

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
        <Label htmlFor="cliente_id">Account *</Label>
        <Popover open={openCliente} onOpenChange={setOpenCliente}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openCliente}
              className="w-full justify-between"
            >
              {selectedCliente ? `${selectedCliente.codigo} - ${selectedCliente.nombre}` : "Select account..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Search account..." />
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
        <Label htmlFor="codigo_producto">Product Code *</Label>
        <Input
          id="codigo_producto"
          value={formData.codigo_producto}
          onChange={(e) => setFormData({ ...formData, codigo_producto: e.target.value })}
          required
          maxLength={50}
        />
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
