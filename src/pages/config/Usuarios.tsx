import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UsuarioForm } from "@/components/config/forms/UsuarioForm";

export default function ConfigUsuarios() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const { data: usuarios, error } = await supabase
      .from("usuarios")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setData(usuarios || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (item: any) => {
    const { error } = await supabase
      .from("usuarios")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "User deleted successfully" });
      loadData();
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "nombre_completo", label: "Full Name" },
    { key: "email", label: "Email" },
    { key: "rol", label: "Role" },
    { key: "estado", label: "Status" },
    { key: "fecha_creacion", label: "Created" },
  ];

  const csvConfig = {
    tableName: "usuarios",
    expectedColumns: ["nombre_completo", "email", "password_hash", "rol", "telefono", "whatsapp_telegram_cuenta", "estado"],
    exampleData: [
      ["Juan Pérez", "juan@example.com", "hashed_password", "gestor", "+34600000000", "@juanperez", "activo"],
      ["María García", "maria@example.com", "hashed_password", "admin", "+34600000001", "@mariagarcia", "activo"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Users Configuration</h1>
          <p className="text-muted-foreground">
            Manage system users and their roles
          </p>
        </div>

        <ConfigDataTable
          title="Users"
          data={data}
          columns={columns}
          onDelete={handleDelete}
          onCreate={() => setCreateDialogOpen(true)}
          isLoading={isLoading}
          csvConfig={csvConfig}
        />

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <UsuarioForm
              onSuccess={() => {
                setCreateDialogOpen(false);
                loadData();
              }}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}