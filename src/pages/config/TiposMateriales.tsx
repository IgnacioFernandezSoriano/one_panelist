import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TipoMaterialForm } from "@/components/config/forms/TipoMaterialForm";
import { useToast } from "@/hooks/use-toast";

export default function TiposMateriales() {
  const [materiales, setMateriales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from("tipos_material")
        .select(`
          *,
          clientes:cliente_id (nombre)
        `)
        .order("codigo", { ascending: true });

      if (error) throw error;
      
      const formattedData = data?.map(m => ({
        ...m,
        account_name: m.clientes?.nombre
      })) || [];
      
      setMateriales(formattedData);
    } catch (error: any) {
      toast({
        title: "Error loading material types",
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
        .from("tipos_material")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Material type deleted",
        description: "The material type has been deleted successfully",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error deleting material type",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const columns = [
    { key: "account_name", label: "Account" },
    { key: "codigo", label: "Code" },
    { key: "nombre", label: "Name" },
    { key: "unidad_medida", label: "Unit of Measure" },
    { key: "descripcion", label: "Description" },
    { key: "estado", label: "Status" },
    { key: "id", label: "ID", hidden: true },
  ];

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Material Types</h1>
            <p className="text-muted-foreground">
              Manage material types catalog for shipments
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Material Type
          </Button>
        </div>

        <ConfigDataTable
          title="Material Types"
          data={materiales}
          columns={columns}
          onEdit={(material) => {
            setEditingMaterial(material);
            setDialogOpen(true);
          }}
          onDelete={(material) => handleDelete(material.id)}
          isLoading={loading}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMaterial ? "Edit Material Type" : "New Material Type"}
              </DialogTitle>
            </DialogHeader>
            <TipoMaterialForm
              initialData={editingMaterial}
              onSuccess={() => {
                setDialogOpen(false);
                setEditingMaterial(null);
                loadData();
              }}
              onCancel={() => {
                setDialogOpen(false);
                setEditingMaterial(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
