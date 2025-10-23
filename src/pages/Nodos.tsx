import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Nodo {
  codigo: string;
  nombre: string;
  ciudad: string;
  pais: string;
  tipo: string;
  estado: string;
}

export default function Nodos() {
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadNodos();
  }, []);

  const loadNodos = async () => {
    try {
      const { data, error } = await supabase
        .from("nodos")
        .select("*")
        .order("codigo", { ascending: true });

      if (error) throw error;
      setNodos(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load nodes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    return estado === "activo" ? "default" : "secondary";
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      urbano: "bg-accent text-accent-foreground",
      rural: "bg-success text-success-foreground",
      centro_logistico: "bg-primary text-primary-foreground",
    };
    return colors[tipo] || "bg-muted";
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Nodes</h1>
            <p className="text-muted-foreground">
              Manage shipping origin and destination points
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Node
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading nodes...</p>
          </div>
        ) : nodos.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No nodes found</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nodos.map((nodo) => (
              <Card key={nodo.codigo} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{nodo.codigo}</h3>
                      <Badge variant={getEstadoBadge(nodo.estado)} className="mt-1">
                        {nodo.estado}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <h4 className="font-medium text-foreground">{nodo.nombre}</h4>
                    <p className="text-sm text-muted-foreground">
                      {nodo.ciudad}, {nodo.pais}
                    </p>
                  </div>

                  <Badge className={getTipoBadge(nodo.tipo)}>
                    {nodo.tipo.replace(/_/g, " ")}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
