import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Envio {
  id: number;
  codigo: string;
  tipo_producto: string;
  estado: string;
  fecha_programada: string;
  nodo_origen: string;
  nodo_destino: string;
}

export default function Envios() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadEnvios();
  }, []);

  const loadEnvios = async () => {
    try {
      const { data, error } = await supabase
        .from("envios")
        .select("*")
        .order("fecha_creacion", { ascending: false });

      if (error) throw error;
      setEnvios(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los envíos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEnvios = envios.filter((e) =>
    e.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.tipo_producto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
      PENDIENTE: { variant: "outline" },
      NOTIFICADO: { variant: "secondary" },
      ENVIADO: { variant: "default" },
      RECIBIDO: { variant: "default", className: "bg-success text-success-foreground" },
      CANCELADO: { variant: "destructive" },
    };
    return variants[estado] || { variant: "secondary" };
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Envíos</h1>
            <p className="text-muted-foreground">
              Gestiona los planes de envío y seguimiento
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Envío
          </Button>
        </div>

        <Card className="p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Buscar por código o tipo de producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando envíos...</p>
          </div>
        ) : filteredEnvios.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No se encontraron envíos</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredEnvios.map((envio) => (
              <Card key={envio.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {envio.codigo}
                      </h3>
                      <Badge 
                        variant={getEstadoBadge(envio.estado).variant}
                        className={getEstadoBadge(envio.estado).className}
                      >
                        {envio.estado}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tipo:</span>
                        <p className="font-medium capitalize">{envio.tipo_producto}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Origen:</span>
                        <p className="font-medium">{envio.nodo_origen}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Destino:</span>
                        <p className="font-medium">{envio.nodo_destino}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fecha programada:</span>
                        <p className="font-medium">
                          {format(new Date(envio.fecha_programada), "dd MMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline">Ver Detalles</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
