import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductoForm } from "@/components/config/forms/ProductoForm";
import { useToast } from "@/hooks/use-toast";

export default function Productos() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from("productos_cliente")
        .select(`
          *,
          clientes (
            nombre
          ),
          carrier_productos (
            carrier_id,
            carriers (
              commercial_name
            )
          )
        `)
        .order("fecha_creacion", { ascending: false });

      if (error) throw error;
      setProductos(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from("productos_cliente")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error deleting product",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const columns = [
    { key: "codigo_producto", label: "Code" },
    { key: "nombre_producto", label: "Name" },
    { key: "clientes.nombre", label: "Account", render: (row: any) => row.clientes?.nombre },
    { 
      key: "carriers", 
      label: "Carriers", 
      render: (row: any) => {
        const carriers = row.carrier_productos || [];
        return carriers.length > 0
          ? carriers.map((cp: any) => cp.carriers?.commercial_name).filter(Boolean).join(", ")
          : "Not assigned";
      }
    },
    { key: "standard_delivery_hours", label: "Std. Delivery (hrs)" },
    { key: "descripcion", label: "Description" },
    { key: "estado", label: "Status" },
    { key: "id", label: "ID", hidden: true },
  ];

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Products</h1>
            <p className="text-muted-foreground">
              Manage product catalog by account
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Product
          </Button>
        </div>

        <ConfigDataTable
          title="Products"
          data={productos}
          columns={columns}
          onEdit={(producto) => {
            setEditingProducto(producto);
            setDialogOpen(true);
          }}
          onDelete={handleDelete}
          isLoading={loading}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProducto ? "Edit Product" : "New Product"}
              </DialogTitle>
            </DialogHeader>
            <ProductoForm
              initialData={editingProducto}
              onSuccess={() => {
                setDialogOpen(false);
                setEditingProducto(null);
                loadData();
              }}
              onCancel={() => {
                setDialogOpen(false);
                setEditingProducto(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
