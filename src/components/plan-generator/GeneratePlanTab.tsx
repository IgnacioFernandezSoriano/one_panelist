import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Papa from "papaparse";
import JSZip from "jszip";

export function GeneratePlanTab() {
  const { isSuperAdmin, clienteId } = useUserRole();
  const { toast } = useToast();
  
  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const [summary, setSummary] = useState({
    citiesConfigured: 0,
    productsConfigured: 0,
    currentEvents: 0,
  });

  const [options, setOptions] = useState({
    includeEvents: true,
    applySeasonality: true,
    applyCityWeights: true,
  });

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (selectedCliente) {
      fetchSummary(selectedCliente);
    }
  }, [selectedCliente, selectedYear]);

  const initializeData = async () => {
    try {
      if (isSuperAdmin()) {
        const { data: clientesData } = await supabase
          .from("clientes")
          .select("*")
          .eq("estado", "activo")
          .order("nombre");
        
        if (clientesData && clientesData.length > 0) {
          setClientes(clientesData);
          setSelectedCliente(clientesData[0].id);
        }
      } else if (clienteId) {
        setSelectedCliente(clienteId);
      }
    } catch (error) {
      console.error("Error initializing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (cliente: number) => {
    try {
      // Count cities with allocations (only count rows with at least one allocation > 0)
      const { data: cityData } = await supabase
        .from("city_allocation_requirements")
        .select("*")
        .eq("cliente_id", cliente);

      const citiesWithData = cityData?.filter(city => 
        city.from_classification_a > 0 || 
        city.from_classification_b > 0 || 
        city.from_classification_c > 0
      ).length || 0;

      // Count products with seasonality
      const { data: productData } = await supabase
        .from("product_seasonality")
        .select("*")
        .eq("cliente_id", cliente)
        .eq("year", selectedYear);

      // Count current events (envios created recently)
      const { data: eventsData } = await supabase
        .from("envios")
        .select("id")
        .eq("cliente_id", cliente)
        .gte("fecha_creacion", new Date(selectedYear, 0, 1).toISOString())
        .lt("fecha_creacion", new Date(selectedYear + 1, 0, 1).toISOString());

      setSummary({
        citiesConfigured: citiesWithData,
        productsConfigured: productData?.length || 0,
        currentEvents: eventsData?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  const generateCSVs = async () => {
    if (!selectedCliente) {
      toast({
        title: "Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    if (summary.citiesConfigured === 0 || summary.productsConfigured === 0) {
      toast({
        title: "Warning",
        description: "No data configured. Please configure city allocations and product seasonality first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);

      // Fetch city allocations
      const { data: cityAllocations } = await supabase
        .from("city_allocation_requirements")
        .select(`
          *,
          ciudades!inner(codigo, nombre, clasificacion)
        `)
        .eq("cliente_id", selectedCliente);

      // Fetch all cities to calculate incoming allocations
      const { data: allCities } = await supabase
        .from("ciudades")
        .select("id, codigo, nombre, clasificacion")
        .eq("cliente_id", selectedCliente)
        .eq("estado", "activo");

      // Fetch product seasonality
      const { data: productSeasonality } = await supabase
        .from("product_seasonality")
        .select("*")
        .eq("cliente_id", selectedCliente)
        .eq("year", selectedYear);

      // Fetch products
      const { data: products } = await supabase
        .from("productos_cliente")
        .select("id, codigo_producto, nombre_producto")
        .eq("cliente_id", selectedCliente)
        .eq("estado", "activo");

      if (!cityAllocations || !allCities || !productSeasonality || !products) {
        throw new Error("Failed to fetch data");
      }

      // Create product lookup map
      const productMap = new Map(products.map(p => [p.id, p]));

      // Calculate incoming allocations for each city
      const cityIncomingMap = new Map();
      
      allCities.forEach(targetCity => {
        let fromA = 0;
        let fromB = 0;
        let fromC = 0;

        // Sum allocations from all source cities to this target city
        cityAllocations.forEach(sourceCity => {
          if (targetCity.clasificacion === 'A') {
            fromA += sourceCity.from_classification_a;
          } else if (targetCity.clasificacion === 'B') {
            fromB += sourceCity.from_classification_b;
          } else if (targetCity.clasificacion === 'C') {
            fromC += sourceCity.from_classification_c;
          }
        });

        cityIncomingMap.set(targetCity.id, {
          codigo: targetCity.codigo,
          nombre: targetCity.nombre,
          clasificacion: targetCity.clasificacion,
          from_a: fromA,
          from_b: fromB,
          from_c: fromC,
          total: fromA + fromB + fromC,
        });
      });

      // Generate CSV 1: City Allocation Requirements (incoming)
      const cityCSV = Array.from(cityIncomingMap.values()).map(city => ({
        ciudad_codigo: city.codigo,
        ciudad_nombre: city.nombre,
        clasificacion: city.clasificacion,
        from_classification_a: city.from_a,
        from_classification_b: city.from_b,
        from_classification_c: city.from_c,
        total_incoming: city.total,
      }));
      const cityCSVString = Papa.unparse(cityCSV);

      // Generate CSV 2: Product Seasonality Plan
      const productCSV = productSeasonality.map(product => {
        const productInfo = productMap.get(product.producto_id);
        return {
          producto_codigo: productInfo?.codigo_producto || '',
          producto_nombre: productInfo?.nombre_producto || '',
          jan_percentage: product.january_percentage,
          feb_percentage: product.february_percentage,
          mar_percentage: product.march_percentage,
          apr_percentage: product.april_percentage,
          may_percentage: product.may_percentage,
          jun_percentage: product.june_percentage,
          jul_percentage: product.july_percentage,
          aug_percentage: product.august_percentage,
          sep_percentage: product.september_percentage,
          oct_percentage: product.october_percentage,
          nov_percentage: product.november_percentage,
          dec_percentage: product.december_percentage,
        };
      });
      const productCSVString = Papa.unparse(productCSV);

      // Generate CSV 3: Current Allocation Plan (from nodos table)
      const { data: nodos } = await supabase
        .from("nodos")
        .select(`
          codigo,
          ciudad,
          panelista_id,
          ciudades!inner(codigo, nombre, clasificacion)
        `)
        .eq("cliente_id", selectedCliente)
        .eq("estado", "activo")
        .not("panelista_id", "is", null);

      const currentAllocationCSV = nodos?.map(nodo => ({
        nodo_codigo: nodo.codigo,
        ciudad_codigo: nodo.ciudades.codigo,
        ciudad_nombre: nodo.ciudades.nombre,
        clasificacion: nodo.ciudades.clasificacion,
        panelista_asignado: nodo.panelista_id ? "Si" : "No",
      })) || [];
      const currentAllocationCSVString = Papa.unparse(currentAllocationCSV);

      // Generate CSV 4: Import Format Template
      const importTemplateCSV = [
        {
          ciudad_codigo: "BCN",
          from_classification_a: "10",
          from_classification_b: "5",
          from_classification_c: "3",
        },
        {
          ciudad_codigo: "MAD",
          from_classification_a: "8",
          from_classification_b: "6",
          from_classification_c: "4",
        },
      ];
      const importTemplateCSVString = Papa.unparse(importTemplateCSV);

      // Generate TXT Documentation
      const documentation = `DOCUMENTACIÓN DE ARCHIVOS DEL PLAN DE ASIGNACIÓN
============================================

1. City_Allocation_Requirements_${selectedYear}.csv
   DESCRIPCIÓN: Requisitos de asignación de panelistas por ciudad
   COLUMNAS:
   - ciudad_codigo: Código único de la ciudad destino
   - ciudad_nombre: Nombre de la ciudad destino
   - clasificacion: Clasificación de la ciudad (A, B, o C)
   - from_classification_a: Número de panelistas que deben llegar desde ciudades tipo A
   - from_classification_b: Número de panelistas que deben llegar desde ciudades tipo B
   - from_classification_c: Número de panelistas que deben llegar desde ciudades tipo C
   - total_incoming: Total de panelistas que deben llegar a esta ciudad
   
   USO: Este archivo muestra cuántos panelistas necesita recibir cada ciudad según las clasificaciones.

2. Product_Seasonality_Plan_${selectedYear}.csv
   DESCRIPCIÓN: Distribución porcentual mensual por producto
   COLUMNAS:
   - producto_codigo: Código único del producto
   - producto_nombre: Nombre del producto
   - jan_percentage a dec_percentage: Porcentaje de distribución para cada mes (debe sumar 100%)
   
   USO: Define la estacionalidad de cada producto a lo largo del año.

3. Current_Allocation_Plan_${selectedYear}.csv
   DESCRIPCIÓN: Estado actual de asignación de nodos y panelistas
   COLUMNAS:
   - nodo_codigo: Código del nodo
   - ciudad_codigo: Código de la ciudad del nodo
   - ciudad_nombre: Nombre de la ciudad
   - clasificacion: Clasificación de la ciudad
   - panelista_asignado: Indica si el nodo tiene panelista asignado (Si/No)
   
   USO: Muestra la situación actual de asignaciones para comparar con el plan objetivo.

4. Import_Format_Template_${selectedYear}.csv
   DESCRIPCIÓN: Plantilla para importar requisitos de asignación de ciudades
   COLUMNAS:
   - ciudad_codigo: Código de la ciudad (debe existir en el sistema)
   - from_classification_a: Cantidad de panelistas desde ciudades A
   - from_classification_b: Cantidad de panelistas desde ciudades B
   - from_classification_c: Cantidad de panelistas desde ciudades C
   
   USO: Use este formato para importar masivamente requisitos de asignación.
        Complete con los códigos de ciudad existentes y las cantidades deseadas.

NOTAS IMPORTANTES:
- Todos los totales deben ser coherentes entre ciudades origen y destino
- Los porcentajes de estacionalidad deben sumar exactamente 100%
- Los códigos de ciudad deben existir previamente en el sistema
- La suma de asignaciones debe coincidir con el número total de nodos disponibles

Fecha de generación: ${new Date().toLocaleString('es-ES')}
Año del plan: ${selectedYear}
`;

      // Create ZIP file
      const zip = new JSZip();
      const timestamp = new Date().toISOString().split('T')[0];
      
      zip.file(`City_Allocation_Requirements_${selectedYear}_${timestamp}.csv`, cityCSVString);
      zip.file(`Product_Seasonality_Plan_${selectedYear}_${timestamp}.csv`, productCSVString);
      zip.file(`Current_Allocation_Plan_${selectedYear}_${timestamp}.csv`, currentAllocationCSVString);
      zip.file(`Import_Format_Template_${selectedYear}_${timestamp}.csv`, importTemplateCSVString);
      zip.file(`LEEME_Documentacion_${selectedYear}_${timestamp}.txt`, documentation);

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Allocation_Plan_${selectedYear}_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Plan generated and downloaded successfully",
      });
    } catch (error) {
      console.error("Error generating plan:", error);
      toast({
        title: "Error",
        description: "Failed to generate plan",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Configuration</CardTitle>
          <CardDescription>Select year and options for plan generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSuperAdmin() && (
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={selectedCliente?.toString()}
                onValueChange={(value) => setSelectedCliente(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                      {cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Year</Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027, 2028].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeEvents"
                checked={options.includeEvents}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeEvents: checked as boolean }))
                }
              />
              <Label htmlFor="includeEvents" className="text-sm font-normal cursor-pointer">
                Include current events in calculation
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="applySeasonality"
                checked={options.applySeasonality}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, applySeasonality: checked as boolean }))
                }
              />
              <Label htmlFor="applySeasonality" className="text-sm font-normal cursor-pointer">
                Apply seasonality adjustments
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="applyCityWeights"
                checked={options.applyCityWeights}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, applyCityWeights: checked as boolean }))
                }
              />
              <Label htmlFor="applyCityWeights" className="text-sm font-normal cursor-pointer">
                Apply city classification weights
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cities Configured</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.citiesConfigured}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cities with allocation data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Products Configured</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.productsConfigured}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Products with seasonality data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Current Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.currentEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Events in selected year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Plan</CardTitle>
          <CardDescription>
            Download allocation plan as CSV files in a ZIP package
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>City_Allocation_Requirements.csv:</strong> Requisitos de asignación por ciudad</span>
            </p>
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Product_Seasonality_Plan.csv:</strong> Distribución porcentual mensual por producto</span>
            </p>
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Current_Allocation_Plan.csv:</strong> Estado actual de asignaciones de nodos</span>
            </p>
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Import_Format_Template.csv:</strong> Plantilla para importar requisitos</span>
            </p>
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>LEEME_Documentacion.txt:</strong> Documentación detallada de todos los archivos</span>
            </p>
          </div>

          <Button 
            onClick={generateCSVs} 
            disabled={generating || !selectedCliente}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Plan...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate & Download Plan
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
