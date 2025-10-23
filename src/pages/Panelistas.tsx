import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Panelista {
  id: number;
  nombre_completo: string;
  direccion_ciudad: string;
  direccion_pais: string;
  telefono: string;
  email: string | null;
  idioma: string;
  plataforma_preferida: string;
  dias_comunicacion: string;
  estado: string;
  nodo_asignado: string | null;
}

export default function Panelistas() {
  const [panelistas, setPanelistas] = useState<Panelista[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPanelistas();
  }, []);

  const loadPanelistas = async () => {
    try {
      const { data, error } = await supabase
        .from("panelistas")
        .select("*")
        .order("fecha_alta", { ascending: false });

      if (error) throw error;
      setPanelistas(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load panelists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPanelistas = panelistas.filter((p) =>
    p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.telefono.includes(searchTerm) ||
    p.direccion_ciudad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      activo: "default",
      inactivo: "secondary",
      suspendido: "destructive",
    };
    return variants[estado] || "secondary";
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Panelists</h1>
            <p className="text-muted-foreground">
              Manage panelists participating in the studies
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Panelist
          </Button>
        </div>

        <Card className="p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search by name, phone or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading panelists...</p>
          </div>
        ) : filteredPanelistas.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No panelists found</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPanelistas.map((panelista) => (
              <Card key={panelista.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {panelista.nombre_completo}
                      </h3>
                      <Badge variant={getEstadoBadge(panelista.estado)}>
                        {panelista.estado}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Location:</span>
                        <p className="font-medium">
                          {panelista.direccion_ciudad}, {panelista.direccion_pais}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone:</span>
                        <p className="font-medium">{panelista.telefono}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Language:</span>
                        <p className="font-medium">{panelista.idioma}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Platform:</span>
                        <p className="font-medium capitalize">{panelista.plataforma_preferida}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Communication Days:</span>
                        <p className="font-medium capitalize">{panelista.dias_comunicacion?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
