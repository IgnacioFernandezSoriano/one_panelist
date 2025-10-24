import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

interface Envio {
  id: number;
  tipo_producto: string;
  estado: string;
  fecha_programada: string;
  nodo_origen: string;
  nodo_destino: string;
  carrier_name?: string;
}

export default function Envios() {
  const navigate = useNavigate();
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
        .order("fecha_programada", { ascending: false });

      if (error) throw error;
      setEnvios(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load shipments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEnvios = envios.filter((e) =>
    e.id.toString().includes(searchTerm) ||
    e.tipo_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nodo_origen.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nodo_destino.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.carrier_name && e.carrier_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
      PENDING: { variant: "outline" },
      NOTIFIED: { variant: "secondary" },
      SENT: { variant: "default" },
      RECEIVED: { variant: "default", className: "bg-success text-success-foreground" },
      CANCELLED: { variant: "destructive" },
    };
    return variants[estado] || { variant: "secondary" };
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Allocation Plan</h1>
            <p className="text-muted-foreground">
              Manage shipping plans and tracking
            </p>
          </div>
          <Button className="gap-2" onClick={() => navigate("/envios/nuevo")}>
            <Plus className="w-4 h-4" />
            Allocation Event
          </Button>
        </div>

        <Card className="p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search by ID, product type, carrier, or node..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading allocation plans...</p>
          </div>
        ) : filteredEnvios.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No allocation plans found</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredEnvios.map((envio) => (
              <Card key={envio.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        Shipment #{envio.id}
                      </h3>
                      <Badge 
                        variant={getEstadoBadge(envio.estado).variant}
                        className={getEstadoBadge(envio.estado).className}
                      >
                        {envio.estado}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <p className="font-medium capitalize">{envio.tipo_producto}</p>
                      </div>
                      {envio.carrier_name && (
                        <div>
                          <span className="text-muted-foreground">Carrier:</span>
                          <p className="font-medium">{envio.carrier_name}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Origin:</span>
                        <p className="font-medium">{envio.nodo_origen}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Destination:</span>
                        <p className="font-medium">{envio.nodo_destino}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Scheduled date:</span>
                        <p className="font-medium">
                          {format(new Date(envio.fecha_programada), "dd MMM yyyy", { locale: enUS })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline">View Details</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
