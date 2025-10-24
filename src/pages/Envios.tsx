import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Upload, FileDown } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CSVImporter } from "@/components/import/CSVImporter";

interface Envio {
  id: number;
  tipo_producto: string;
  estado: string;
  fecha_programada: string;
  fecha_limite?: string;
  nodo_origen: string;
  nodo_destino: string;
  carrier_name?: string;
  carrier_id?: number;
  cliente_id: number;
  producto_id?: number;
  panelista_origen_id?: number;
  panelista_destino_id?: number;
  numero_etiqueta?: string;
  carriers?: {
    legal_name: string;
    carrier_code?: string;
  };
  clientes?: {
    nombre: string;
    codigo: string;
  };
  productos_cliente?: {
    nombre_producto: string;
    codigo_producto: string;
  };
  panelista_origen?: {
    nombre_completo: string;
    nodo_asignado?: string;
  };
  panelista_destino?: {
    nombre_completo: string;
    nodo_asignado?: string;
  };
}

export default function Envios() {
  const navigate = useNavigate();
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadEnvios();
  }, []);

  const loadEnvios = async () => {
    try {
      const { data, error } = await supabase
        .from("envios")
        .select(`
          *,
          carriers:carrier_id (
            legal_name,
            carrier_code
          ),
          clientes:cliente_id (
            nombre,
            codigo
          ),
          productos_cliente:producto_id (
            nombre_producto,
            codigo_producto
          ),
          panelista_origen:panelistas!panelista_origen_id (
            nombre_completo,
            nodo_asignado
          ),
          panelista_destino:panelistas!panelista_destino_id (
            nombre_completo,
            nodo_asignado
          )
        `)
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

  const exportTopologyCSV = async () => {
    try {
      const { data, error } = await supabase
        .from("nodos")
        .select(`
          codigo,
          pais,
          estado,
          panelista_id,
          ciudades!inner (
            codigo,
            nombre,
            clasificacion,
            regiones!inner (
              codigo,
              nombre,
              clientes!inner (
                codigo,
                nombre
              )
            )
          )
        `)
        .eq("estado", "activo")
        .order("codigo");

      if (error) throw error;

      const csvData = data.map(nodo => ({
        cliente_codigo: nodo.ciudades.regiones.clientes.codigo,
        cliente_nombre: nodo.ciudades.regiones.clientes.nombre,
        region_codigo: nodo.ciudades.regiones.codigo,
        region_nombre: nodo.ciudades.regiones.nombre,
        ciudad_codigo: nodo.ciudades.codigo,
        ciudad_nombre: nodo.ciudades.nombre,
        ciudad_clasificacion: nodo.ciudades.clasificacion || '',
        nodo_codigo: nodo.codigo,
        nodo_pais: nodo.pais,
        nodo_estado: nodo.estado,
        tiene_panelista_activo: nodo.panelista_id ? 'SI' : 'NO',
        from_A: '',
        from_B: '',
        from_C: ''
      }));

      const csv = Papa.unparse(csvData, {
        quotes: true,
        header: true
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const fecha = format(new Date(), 'yyyy-MM-dd');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `topologia_nodos_${fecha}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Topology CSV exported with ${csvData.length} nodes`,
      });

    } catch (error: any) {
      toast({
        title: "Export error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredEnvios = envios.filter((e) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      e.id.toString().includes(searchTerm) ||
      e.tipo_producto.toLowerCase().includes(searchLower) ||
      e.estado.toLowerCase().includes(searchLower) ||
      e.nodo_origen.toLowerCase().includes(searchLower) ||
      e.nodo_destino.toLowerCase().includes(searchLower) ||
      (e.numero_etiqueta && e.numero_etiqueta.toLowerCase().includes(searchLower)) ||
      (e.carrier_name && e.carrier_name.toLowerCase().includes(searchLower)) ||
      (e.carriers?.legal_name && e.carriers.legal_name.toLowerCase().includes(searchLower)) ||
      (e.carriers?.carrier_code && e.carriers.carrier_code.toLowerCase().includes(searchLower)) ||
      (e.clientes?.nombre && e.clientes.nombre.toLowerCase().includes(searchLower)) ||
      (e.clientes?.codigo && e.clientes.codigo.toLowerCase().includes(searchLower)) ||
      (e.productos_cliente?.nombre_producto && e.productos_cliente.nombre_producto.toLowerCase().includes(searchLower)) ||
      (e.productos_cliente?.codigo_producto && e.productos_cliente.codigo_producto.toLowerCase().includes(searchLower)) ||
      (e.panelista_origen?.nombre_completo && e.panelista_origen.nombre_completo.toLowerCase().includes(searchLower)) ||
      (e.panelista_origen?.nodo_asignado && e.panelista_origen.nodo_asignado.toLowerCase().includes(searchLower)) ||
      (e.panelista_destino?.nombre_completo && e.panelista_destino.nombre_completo.toLowerCase().includes(searchLower)) ||
      (e.panelista_destino?.nodo_asignado && e.panelista_destino.nodo_asignado.toLowerCase().includes(searchLower))
    );
  });

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
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportTopologyCSV}>
              <FileDown className="w-4 h-4" />
              Export Topology CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
            <Button className="gap-2" onClick={() => navigate("/envios/nuevo")}>
              <Plus className="w-4 h-4" />
              Allocation Event
            </Button>
          </div>
        </div>

        <Card className="p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search by ID, account, product, carrier, panelist name, node, label..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Search across all fields: accounts, products, carriers, panelists, nodes, and tracking labels
          </p>
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
                        #{envio.id}
                        {envio.numero_etiqueta && <span className="text-muted-foreground font-normal"> • {envio.numero_etiqueta}</span>}
                      </h3>
                      <Badge 
                        variant={getEstadoBadge(envio.estado).variant}
                        className={getEstadoBadge(envio.estado).className}
                      >
                        {envio.estado}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                      {envio.clientes && (
                        <div>
                          <span className="text-muted-foreground">Account:</span>
                          <p className="font-medium">{envio.clientes.codigo}</p>
                          <p className="text-xs text-muted-foreground truncate">{envio.clientes.nombre}</p>
                        </div>
                      )}
                      
                      {envio.productos_cliente && (
                        <div>
                          <span className="text-muted-foreground">Product:</span>
                          <p className="font-medium">{envio.productos_cliente.codigo_producto}</p>
                          <p className="text-xs text-muted-foreground truncate">{envio.productos_cliente.nombre_producto}</p>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <p className="font-medium capitalize">{envio.tipo_producto}</p>
                      </div>
                      
                      {(envio.carriers || envio.carrier_name) && (
                        <div>
                          <span className="text-muted-foreground">Carrier:</span>
                          <p className="font-medium">
                            {envio.carriers?.carrier_code || envio.carrier_name}
                          </p>
                          {envio.carriers?.legal_name && (
                            <p className="text-xs text-muted-foreground truncate">{envio.carriers.legal_name}</p>
                          )}
                        </div>
                      )}
                      
                      <div>
                        <span className="text-muted-foreground">Origin:</span>
                        <p className="font-medium">{envio.nodo_origen}</p>
                        {envio.panelista_origen && (
                          <p className="text-xs text-muted-foreground truncate">{envio.panelista_origen.nombre_completo}</p>
                        )}
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Destination:</span>
                        <p className="font-medium">{envio.nodo_destino}</p>
                        {envio.panelista_destino && (
                          <p className="text-xs text-muted-foreground truncate">{envio.panelista_destino.nombre_completo}</p>
                        )}
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Scheduled:</span>
                        <p className="font-medium">
                          {format(new Date(envio.fecha_programada), "dd MMM yyyy", { locale: enUS })}
                        </p>
                      </div>
                      
                      {envio.fecha_limite && (
                        <div>
                          <span className="text-muted-foreground">Due date:</span>
                          <p className="font-medium">
                            {format(new Date(envio.fecha_limite), "dd MMM yyyy", { locale: enUS })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Allocation Plans</DialogTitle>
            </DialogHeader>
            <CSVImporter
              tableName="envios"
              tableLabel="Allocation Plans"
              expectedColumns={[
                "cliente_id",
                "carrier_id",
                "producto_id",
                "panelista_origen_id",
                "panelista_destino_id",
                "nodo_origen",
                "nodo_destino",
                "fecha_programada",
                "tipo_producto",
                "estado",
                "motivo_creacion"
              ]}
              exampleData={[
                {
                  cliente_id: "1",
                  carrier_id: "1",
                  producto_id: "2",
                  panelista_origen_id: "5",
                  panelista_destino_id: "8",
                  nodo_origen: "MAD",
                  nodo_destino: "BCN",
                  fecha_programada: "2025-01-15",
                  tipo_producto: "letter",
                  estado: "PENDING",
                  motivo_creacion: "scheduled"
                },
              ]}
              onImportComplete={() => {
                setImportDialogOpen(false);
                loadEnvios();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
