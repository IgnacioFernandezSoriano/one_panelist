import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Calendar } from "lucide-react";
import { format } from "date-fns";

interface MaterialsByPanelist {
  panelista_id: number;
  panelista_nombre: string;
  direccion_completa: string;
  total_envios: number;
  materiales: Record<string, {
    cantidad: number;
    unidad_medida: string;
  }>;
}

export default function PanelistMaterialsPlan() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<MaterialsByPanelist[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch envios with panelist details and product materials
      const { data: enviosData, error } = await supabase
        .from("envios")
        .select(`
          id,
          tipo_producto,
          panelista_destino_id,
          producto_id,
          panelistas!envios_panelista_destino_id_fkey (
            id,
            nombre_completo,
            direccion_calle,
            direccion_ciudad,
            direccion_codigo_postal,
            direccion_pais
          ),
          productos_cliente!inner (
            id,
            nombre_producto,
            producto_materiales (
              cantidad,
              tipos_material (
                codigo,
                nombre,
                unidad_medida
              )
            )
          )
        `)
        .gte("fecha_programada", startDate)
        .lte("fecha_programada", endDate)
        .not("panelista_destino_id", "is", null)
        .not("producto_id", "is", null);

      if (error) throw error;

      // Group by panelist and calculate materials
      const grouped = enviosData.reduce((acc: Record<number, MaterialsByPanelist>, envio: any) => {
        const panelistaId = envio.panelista_destino_id;
        const panelista = envio.panelistas;
        
        if (!panelista) return acc;

        if (!acc[panelistaId]) {
          acc[panelistaId] = {
            panelista_id: panelistaId,
            panelista_nombre: panelista.nombre_completo,
            direccion_completa: `${panelista.direccion_calle}, ${panelista.direccion_ciudad}, ${panelista.direccion_codigo_postal}, ${panelista.direccion_pais}`,
            total_envios: 0,
            materiales: {},
          };
        }

        // Count total envios
        acc[panelistaId].total_envios += 1;

        // Calculate materials from product configuration
        if (envio.productos_cliente?.producto_materiales) {
          envio.productos_cliente.producto_materiales.forEach((pm: any) => {
            const material = pm.tipos_material;
            if (!material) return;

            const key = `${material.codigo} - ${material.nombre}`;
            if (!acc[panelistaId].materiales[key]) {
              acc[panelistaId].materiales[key] = {
                cantidad: 0,
                unidad_medida: material.unidad_medida,
              };
            }
            acc[panelistaId].materiales[key].cantidad += pm.cantidad;
          });
        }

        return acc;
      }, {});

      const result = Object.values(grouped).sort((a, b) => 
        a.panelista_nombre.localeCompare(b.panelista_nombre)
      );

      setData(result);
      
      toast({
        title: "Data loaded successfully",
        description: `Found ${result.length} panelists with shipments`,
      });
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) {
      toast({
        title: "No data to export",
        description: "Please load data first",
        variant: "destructive",
      });
      return;
    }

    // Get all unique material types
    const allMaterials = new Set<string>();
    data.forEach(item => {
      Object.keys(item.materiales).forEach(material => allMaterials.add(material));
    });
    const sortedMaterials = Array.from(allMaterials).sort();

    // Build CSV header
    const headers = [
      "Panelist ID",
      "Panelist Name",
      "Address",
      "Total Shipments",
      ...sortedMaterials.flatMap(material => [`${material} (Qty)`, `${material} (Unit)`])
    ];

    // Build CSV rows
    const rows = data.map(item => {
      const materialValues = sortedMaterials.flatMap(material => {
        const mat = item.materiales[material];
        return [mat?.cantidad || 0, mat?.unidad_medida || ''];
      });
      
      const row = [
        item.panelista_id,
        `"${item.panelista_nombre}"`,
        `"${item.direccion_completa}"`,
        item.total_envios,
        ...materialValues
      ];
      return row.join(",");
    });

    // Combine header and rows
    const csv = [headers.join(","), ...rows].join("\n");

    // Download file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `panelist_materials_plan_${startDate}_to_${endDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV exported successfully",
      description: `Exported ${data.length} panelist records`,
    });
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panelist Materials Plan</h1>
          <p className="text-muted-foreground mt-2">
            Calculate materials needed per panelist based on scheduled shipments
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Date Range Filter</CardTitle>
            <CardDescription>
              Select date range to calculate materials for scheduled shipments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={loadData} 
                  disabled={loading || !startDate || !endDate}
                  className="flex-1"
                >
                  {loading ? "Loading..." : "Load Data"}
                </Button>
                <Button
                  onClick={exportToCSV}
                  disabled={data.length === 0}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Materials Summary</CardTitle>
              <CardDescription>
                {data.length} panelists with shipments between {format(new Date(startDate), "PP")} and {format(new Date(endDate), "PP")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Panelist Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Total Shipments</TableHead>
                      <TableHead>Materials Required</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((item) => (
                      <TableRow key={item.panelista_id}>
                        <TableCell className="font-medium">
                          {item.panelista_nombre}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs">
                          {item.direccion_completa}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.total_envios}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(item.materiales).map(([material, info]) => (
                              <span
                                key={material}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                              >
                                {material}: {info.cantidad} {info.unidad_medida}
                              </span>
                            ))}
                            {Object.keys(item.materiales).length === 0 && (
                              <span className="text-sm text-muted-foreground">
                                No materials configured
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {data.length === 0 && !loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Select date range and click "Load Data" to see materials plan
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
