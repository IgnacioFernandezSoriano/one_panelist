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

interface Incidencia {
  id: number;
  tipo: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  origen: string;
  fecha_creacion: string;
}

export default function Incidencias() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadIncidencias();
  }, []);

  const loadIncidencias = async () => {
    try {
      const { data, error } = await supabase
        .from("incidencias")
        .select("*")
        .order("fecha_creacion", { ascending: false });

      if (error) throw error;
      setIncidencias(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las incidencias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidencias = incidencias.filter((i) =>
    i.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPrioridadBadge = (prioridad: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
      baja: { variant: "secondary" },
      media: { variant: "outline" },
      alta: { variant: "default", className: "bg-warning text-warning-foreground" },
      critica: { variant: "destructive" },
    };
    return variants[prioridad] || { variant: "secondary" };
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      abierta: "destructive",
      en_proceso: "default",
      resuelta: "secondary",
      cerrada: "outline",
    };
    return variants[estado] || "secondary";
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Incidencias</h1>
            <p className="text-muted-foreground">
              Gestiona las incidencias y problemas reportados
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Incidencia
          </Button>
        </div>

        <Card className="p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Buscar por descripción o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando incidencias...</p>
          </div>
        ) : filteredIncidencias.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No se encontraron incidencias</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredIncidencias.map((incidencia) => (
              <Card key={incidencia.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {incidencia.tipo.replace(/_/g, " ").toUpperCase()}
                      </h3>
                      <Badge variant={getEstadoBadge(incidencia.estado)}>
                        {incidencia.estado.replace(/_/g, " ")}
                      </Badge>
                      <Badge 
                        variant={getPrioridadBadge(incidencia.prioridad).variant}
                        className={getPrioridadBadge(incidencia.prioridad).className}
                      >
                        {incidencia.prioridad}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground mb-3">
                      {incidencia.descripcion}
                    </p>

                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">Origen:</span>
                        <span className="ml-2 font-medium capitalize">{incidencia.origen}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Creada:</span>
                        <span className="ml-2 font-medium">
                          {format(new Date(incidencia.fecha_creacion), "dd MMM yyyy HH:mm", { locale: es })}
                        </span>
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
