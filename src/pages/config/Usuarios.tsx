import { AppLayout } from "@/components/layout/AppLayout";
import { ConfigDataTable } from "@/components/config/ConfigDataTable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UsuarioForm } from "@/components/config/forms/UsuarioForm";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";

export default function ConfigUsuarios() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

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
        title: t("message.error.load"),
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
        title: t("message.error.delete"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: t("message.success.deleted") });
      loadData();
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "nombre_completo", label: t("label.name") },
    { key: "email", label: t("label.email") },
    { key: "rol", label: t("config.users.role") },
    { key: "idioma_preferido", label: t("label.language") },
    { 
      key: "estado", 
      label: t("label.status"),
      render: (item: any) => item.estado === "activo" ? (
        <Badge variant="default" className="bg-success text-white">{t("label.active")}</Badge>
      ) : (
        <Badge variant="destructive" className="bg-destructive text-white">{t("label.inactive")}</Badge>
      )
    },
    { key: "fecha_creacion", label: t("label.date") },
  ];

  const csvConfig = {
    tableName: "usuarios",
    expectedColumns: ["nombre_completo", "email", "password_hash", "rol", "telefono", "whatsapp_telegram_cuenta", "idioma_preferido", "estado"],
    exampleData: [
      ["Juan Pérez", "juan@example.com", "hashed_password", "gestor", "+34600000000", "@juanperez", "es", "activo"],
      ["María García", "maria@example.com", "hashed_password", "admin", "+34600000001", "@mariagarcia", "en", "activo"],
    ],
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("config.users.title")}</h1>
          <p className="text-muted-foreground">
            {t("config.users.subtitle")}
          </p>
        </div>

        <ConfigDataTable
          title={t("menu.users")}
          data={data}
          columns={columns}
          onEdit={(item) => {
            setSelectedItem(item);
            setEditDialogOpen(true);
          }}
          onDelete={handleDelete}
          onCreate={() => setCreateDialogOpen(true)}
          isLoading={isLoading}
          csvConfig={csvConfig}
        />

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("action.add")} {t("menu.users")}</DialogTitle>
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

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("action.edit")} {t("menu.users")}</DialogTitle>
            </DialogHeader>
            <UsuarioForm
              initialData={selectedItem}
              onSuccess={() => {
                setEditDialogOpen(false);
                setSelectedItem(null);
                loadData();
              }}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedItem(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}