import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuickCreateProductoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newProducto: any) => void;
  clienteId: number;
}

export function QuickCreateProducto({ open, onOpenChange, onSuccess, clienteId }: QuickCreateProductoProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    codigo_producto: "",
    nombre_producto: "",
    descripcion: "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("productos_cliente")
        .insert([{
          ...formData,
          cliente_id: clienteId
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Product created",
        description: "New product has been created successfully",
      });

      onSuccess(data);
      onOpenChange(false);
      setFormData({ codigo_producto: "", nombre_producto: "", descripcion: "" });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo_producto">Product Code *</Label>
            <Input
              id="codigo_producto"
              value={formData.codigo_producto}
              onChange={(e) => setFormData({ ...formData, codigo_producto: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre_producto">Product Name *</Label>
            <Input
              id="nombre_producto"
              value={formData.nombre_producto}
              onChange={(e) => setFormData({ ...formData, nombre_producto: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descripcion">Description</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Optional description"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
