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
      // Count cities with allocations
      const { data: cityData, count: cityCount } = await supabase
        .from("city_allocation_requirements")
        .select("*", { count: 'exact', head: true })
        .eq("cliente_id", cliente);

      // Count products with seasonality
      const { data: productData, count: productCount } = await supabase
        .from("product_seasonality")
        .select("*", { count: 'exact', head: true })
        .eq("cliente_id", cliente)
        .eq("year", selectedYear);

      // Count current events (envios created recently)
      const { data: eventsData, count: eventsCount } = await supabase
        .from("envios")
        .select("*", { count: 'exact', head: true })
        .eq("cliente_id", cliente)
        .gte("fecha_creacion", new Date(selectedYear, 0, 1).toISOString())
        .lt("fecha_creacion", new Date(selectedYear + 1, 0, 1).toISOString());

      setSummary({
        citiesConfigured: cityCount || 0,
        productsConfigured: productCount || 0,
        currentEvents: eventsCount || 0,
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

      // Fetch product seasonality
      const { data: productSeasonality } = await supabase
        .from("product_seasonality")
        .select("*")
        .eq("cliente_id", selectedCliente)
        .eq("year", selectedYear);

      // Fetch products separately
      const { data: products } = await supabase
        .from("productos_cliente")
        .select("id, codigo_producto, nombre_producto")
        .eq("cliente_id", selectedCliente)
        .eq("estado", "activo");

      if (!cityAllocations || !productSeasonality || !products) {
        throw new Error("Failed to fetch data");
      }

      // Create product lookup map
      const productMap = new Map(products.map(p => [p.id, p]));

      // Generate CSV 1: City Allocation Plan
      const cityCSV = cityAllocations.map(city => ({
        ciudad_codigo: city.ciudades.codigo,
        ciudad_nombre: city.ciudades.nombre,
        clasificacion: city.ciudades.clasificacion,
        allocation_a: city.from_classification_a,
        allocation_b: city.from_classification_b,
        allocation_c: city.from_classification_c,
        total_allocation: city.from_classification_a + city.from_classification_b + city.from_classification_c,
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

      // Generate CSV 3: Combined Allocation Matrix
      const combinedMatrix: any[] = [];
      cityAllocations.forEach(city => {
        productSeasonality.forEach(product => {
          const productInfo = productMap.get(product.producto_id);
          const baseAllocation = city.from_classification_a + city.from_classification_b + city.from_classification_c;
          combinedMatrix.push({
            ciudad: city.ciudades.nombre,
            ciudad_codigo: city.ciudades.codigo,
            producto: productInfo?.nombre_producto || '',
            producto_codigo: productInfo?.codigo_producto || '',
            january: (baseAllocation * (product.january_percentage / 100)).toFixed(2),
            february: (baseAllocation * (product.february_percentage / 100)).toFixed(2),
            march: (baseAllocation * (product.march_percentage / 100)).toFixed(2),
            april: (baseAllocation * (product.april_percentage / 100)).toFixed(2),
            may: (baseAllocation * (product.may_percentage / 100)).toFixed(2),
            june: (baseAllocation * (product.june_percentage / 100)).toFixed(2),
            july: (baseAllocation * (product.july_percentage / 100)).toFixed(2),
            august: (baseAllocation * (product.august_percentage / 100)).toFixed(2),
            september: (baseAllocation * (product.september_percentage / 100)).toFixed(2),
            october: (baseAllocation * (product.october_percentage / 100)).toFixed(2),
            november: (baseAllocation * (product.november_percentage / 100)).toFixed(2),
            december: (baseAllocation * (product.december_percentage / 100)).toFixed(2),
          });
        });
      });
      const combinedCSVString = Papa.unparse(combinedMatrix);

      // Create ZIP file
      const zip = new JSZip();
      const timestamp = new Date().toISOString().split('T')[0];
      
      zip.file(`City_Allocation_Plan_${selectedYear}_${timestamp}.csv`, cityCSVString);
      zip.file(`Product_Seasonality_Plan_${selectedYear}_${timestamp}.csv`, productCSVString);
      zip.file(`Combined_Allocation_Matrix_${selectedYear}_${timestamp}.csv`, combinedCSVString);

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
              <span><strong>City_Allocation_Plan.csv:</strong> City allocation requirements by classification</span>
            </p>
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Product_Seasonality_Plan.csv:</strong> Monthly percentage distribution for each product</span>
            </p>
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Combined_Allocation_Matrix.csv:</strong> Combined city × product × month allocation matrix</span>
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
