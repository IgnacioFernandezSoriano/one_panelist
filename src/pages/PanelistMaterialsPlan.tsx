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

interface MaterialsGroup {
  type: 'panelist' | 'node';
  id: string;
  nombre: string;
  direccion_completa?: string;
  ciudad?: string;
  pais?: string;
  total_envios: number;
  materiales: Record<string, {
    cantidad: number;
    unidad_medida: string;
  }>;
}

export default function PanelistMaterialsPlan() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<{
    panelistas: MaterialsGroup[];
    nodos: MaterialsGroup[];
    totals: Record<string, { cantidad: number; unidad_medida: string }>;
  }>({ panelistas: [], nodos: [], totals: {} });
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
      // Fetch from allocation plan details
      const { data: planData, error: planError } = await supabase
        .from("generated_allocation_plan_details")
        .select(`
          id,
          nodo_destino,
          producto_id,
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
        .not("producto_id", "is", null);

      if (planError) throw planError;

      // Get nodos info with panelist assignments
      const nodoCodigos = planData?.map(p => p.nodo_destino).filter(Boolean) || [];
      const { data: nodosData, error: nodosError } = await supabase
        .from("nodos")
        .select(`
          codigo,
          ciudad,
          pais,
          panelista_id,
          panelistas!fk_nodos_panelista (
            id,
            nombre_completo,
            direccion_calle,
            direccion_ciudad,
            direccion_codigo_postal,
            direccion_pais
          )
        `)
        .in("codigo", nodoCodigos);

      if (nodosError) throw nodosError;

      // Create nodo lookup map
      const nodoMap = new Map();
      nodosData?.forEach(n => nodoMap.set(n.codigo, n));

      // Group by panelist OR node
      const grouped = planData?.reduce((acc: Record<string, MaterialsGroup>, item: any) => {
        const nodo = nodoMap.get(item.nodo_destino);
        if (!nodo) return acc;

        let groupKey: string;
        let groupData: Partial<MaterialsGroup>;

        if (nodo.panelista_id && nodo.panelistas) {
          // Group by PANELIST
          groupKey = `panelist-${nodo.panelista_id}`;
          groupData = {
            type: 'panelist',
            id: String(nodo.panelista_id),
            nombre: nodo.panelistas.nombre_completo,
            direccion_completa: `${nodo.panelistas.direccion_calle}, ${nodo.panelistas.direccion_ciudad}, ${nodo.panelistas.direccion_codigo_postal}, ${nodo.panelistas.direccion_pais}`,
          };
        } else {
          // Group by NODE (no panelist assigned)
          groupKey = `node-${nodo.codigo}`;
          groupData = {
            type: 'node',
            id: nodo.codigo,
            nombre: nodo.codigo,
            ciudad: nodo.ciudad,
            pais: nodo.pais,
          };
        }

        // Initialize group if not exists
        if (!acc[groupKey]) {
          acc[groupKey] = {
            ...groupData,
            total_envios: 0,
            materiales: {},
          } as MaterialsGroup;
        }

        // Count shipments
        acc[groupKey].total_envios += 1;

        // Sum materials
        if (item.productos_cliente?.producto_materiales) {
          item.productos_cliente.producto_materiales.forEach((pm: any) => {
            const material = pm.tipos_material;
            if (!material) return;

            const key = `${material.codigo} - ${material.nombre}`;
            if (!acc[groupKey].materiales[key]) {
              acc[groupKey].materiales[key] = {
                cantidad: 0,
                unidad_medida: material.unidad_medida,
              };
            }
            acc[groupKey].materiales[key].cantidad += pm.cantidad;
          });
        }

        return acc;
      }, {});

      const result = Object.values(grouped || {});
      const panelistas = result.filter(g => g.type === 'panelist').sort((a, b) => a.nombre.localeCompare(b.nombre));
      const nodos = result.filter(g => g.type === 'node').sort((a, b) => a.nombre.localeCompare(b.nombre));

      // Calculate total materials
      const totalMaterials: Record<string, { cantidad: number; unidad_medida: string }> = {};
      result.forEach(group => {
        Object.entries(group.materiales).forEach(([material, info]) => {
          if (!totalMaterials[material]) {
            totalMaterials[material] = { cantidad: 0, unidad_medida: info.unidad_medida };
          }
          totalMaterials[material].cantidad += info.cantidad;
        });
      });

      setData({ panelistas, nodos, totals: totalMaterials });
      
      toast({
        title: "Data loaded successfully",
        description: `Found ${panelistas.length} panelists and ${nodos.length} nodes`,
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
    if (data.panelistas.length === 0 && data.nodos.length === 0) {
      toast({
        title: "No data to export",
        description: "Please load data first",
        variant: "destructive",
      });
      return;
    }

    const allData = [...data.panelistas, ...data.nodos];
    
    // Get all unique material types
    const allMaterials = new Set<string>();
    allData.forEach(item => {
      Object.keys(item.materiales).forEach(material => allMaterials.add(material));
    });
    const sortedMaterials = Array.from(allMaterials).sort();

    // Build CSV sections
    let csv = "";

    // Section 1: Panelistas
    if (data.panelistas.length > 0) {
      csv += "MATERIALS BY PANELIST\n";
      const panelistHeaders = [
        "Type",
        "Panelist ID",
        "Name",
        "Address",
        "Total Shipments",
        ...sortedMaterials.flatMap(material => [`${material} (Qty)`, `${material} (Unit)`])
      ];
      csv += panelistHeaders.join(",") + "\n";
      
      data.panelistas.forEach(item => {
        const materialValues = sortedMaterials.flatMap(material => {
          const mat = item.materiales[material];
          return [mat?.cantidad || 0, mat?.unidad_medida || ''];
        });
        const row = [
          "Panelist",
          item.id,
          `"${item.nombre}"`,
          `"${item.direccion_completa}"`,
          item.total_envios,
          ...materialValues
        ];
        csv += row.join(",") + "\n";
      });
      csv += "\n";
    }

    // Section 2: Nodos sin panelista
    if (data.nodos.length > 0) {
      csv += "MATERIALS BY NODE (NO PANELIST ASSIGNED)\n";
      const nodeHeaders = [
        "Type",
        "Node Code",
        "City",
        "Country",
        "Total Shipments",
        ...sortedMaterials.flatMap(material => [`${material} (Qty)`, `${material} (Unit)`])
      ];
      csv += nodeHeaders.join(",") + "\n";
      
      data.nodos.forEach(item => {
        const materialValues = sortedMaterials.flatMap(material => {
          const mat = item.materiales[material];
          return [mat?.cantidad || 0, mat?.unidad_medida || ''];
        });
        const row = [
          "Node",
          item.id,
          `"${item.ciudad}"`,
          `"${item.pais}"`,
          item.total_envios,
          ...materialValues
        ];
        csv += row.join(",") + "\n";
      });
      csv += "\n";
    }

    // Section 3: Totals
    csv += "TOTAL MATERIALS TO PURCHASE\n";
    csv += "Material,Total Quantity,Unit\n";
    Object.entries(data.totals).forEach(([material, info]) => {
      csv += `"${material}",${info.cantidad},${info.unidad_medida}\n`;
    });

    // Download file
    const blob = new Blob(['\uFEFF' + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `materials_plan_${startDate}_to_${endDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV exported successfully",
      description: `Exported ${data.panelistas.length} panelists, ${data.nodos.length} nodes`,
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
                  disabled={data.panelistas.length === 0 && data.nodos.length === 0}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Materials Summary */}
        {Object.keys(data.totals).length > 0 && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl">Total Materials to Purchase</CardTitle>
              <CardDescription>
                Complete materials summary for period {format(new Date(startDate), "PP")} to {format(new Date(endDate), "PP")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(data.totals)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([material, info]) => (
                    <div key={material} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <span className="font-medium">{material}</span>
                      <span className="text-2xl font-bold text-primary">
                        {info.cantidad} {info.unidad_medida}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Materials by Panelist */}
        {data.panelistas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Materials by Panelist</CardTitle>
              <CardDescription>
                {data.panelistas.length} panelists with assigned nodes
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
                    {data.panelistas.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.nombre}
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

        {/* Materials by Node (no panelist) */}
        {data.nodos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Materials by Node (No Panelist Assigned)</CardTitle>
              <CardDescription>
                {data.nodos.length} nodes without panelist assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Node Code</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Total Shipments</TableHead>
                      <TableHead>Materials Required</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.nodos.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.nombre}
                        </TableCell>
                        <TableCell>{item.ciudad}</TableCell>
                        <TableCell>{item.pais}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.total_envios}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(item.materiales).map(([material, info]) => (
                              <span
                                key={material}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/50 text-secondary-foreground"
                              >
                                {material}: {info.cantidad} {info.unidad_medida}
                              </span>
                            ))}
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

        {data.panelistas.length === 0 && data.nodos.length === 0 && !loading && (
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
