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
          // Fetch summary immediately for the first client
          await fetchSummary(clientesData[0].id);
        }
      } else if (clienteId) {
        setSelectedCliente(clienteId);
        // Fetch summary immediately for the user's client
        await fetchSummary(clienteId);
      }
    } catch (error) {
      console.error("Error initializing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (cliente: number) => {
    try {
      console.log("Fetching summary for cliente:", cliente, "year:", selectedYear);
      
      // Count cities with allocations (only count rows with at least one allocation > 0)
      const { data: cityData, error: cityError } = await supabase
        .from("city_allocation_requirements")
        .select("*")
        .eq("cliente_id", cliente);

      console.log("City data fetched:", cityData, "error:", cityError);

      const citiesWithData = cityData?.filter(city => 
        city.from_classification_a > 0 || 
        city.from_classification_b > 0 || 
        city.from_classification_c > 0
      ).length || 0;

      console.log("Cities with data:", citiesWithData);

      // Count products with seasonality
      const { data: productData, error: productError } = await supabase
        .from("product_seasonality")
        .select("*")
        .eq("cliente_id", cliente)
        .eq("year", selectedYear);

      console.log("Product data fetched:", productData, "error:", productError);

      // Count current events (envios created recently)
      const { data: eventsData, error: eventsError } = await supabase
        .from("envios")
        .select("id")
        .eq("cliente_id", cliente)
        .gte("fecha_creacion", new Date(selectedYear, 0, 1).toISOString())
        .lt("fecha_creacion", new Date(selectedYear + 1, 0, 1).toISOString());

      console.log("Events data fetched:", eventsData, "error:", eventsError);

      const newSummary = {
        citiesConfigured: citiesWithData,
        productsConfigured: productData?.length || 0,
        currentEvents: eventsData?.length || 0,
      };

      console.log("Setting summary:", newSummary);
      setSummary(newSummary);
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

      // Generate TXT Documentation (Trilingual: Spanish, English, French)
      const documentation = `═══════════════════════════════════════════════════════════════
DOCUMENTACIÓN DE ARCHIVOS DEL PLAN DE ASIGNACIÓN
═══════════════════════════════════════════════════════════════

1. City_Allocation_Requirements_${selectedYear}.csv
   
   DESCRIPCIÓN: Requisitos de eventos de asignación por ciudad
   COLUMNAS:
   - ciudad_codigo: Código único de la ciudad destino
   - ciudad_nombre: Nombre de la ciudad destino
   - clasificacion: Clasificación de la ciudad (A, B, o C)
   - from_classification_a: Número de eventos que deben llegar desde ciudades tipo A
   - from_classification_b: Número de eventos que deben llegar desde ciudades tipo B
   - from_classification_c: Número de eventos que deben llegar desde ciudades tipo C
   - total_incoming: Total de eventos que deben llegar a esta ciudad combinando todas las ciudades
   
   USO: Este archivo muestra cuántos eventos necesita recibir cada ciudad según las clasificaciones en el periodo.

2. Product_Seasonality_Plan_${selectedYear}.csv
   
   DESCRIPCIÓN: Distribución porcentual mensual por producto
   COLUMNAS:
   - producto_codigo: Código único del producto
   - producto_nombre: Nombre del producto
   - jan_percentage a dec_percentage: Porcentaje de distribución de eventos por producto para cada mes (debe sumar 100%)
   
   USO: Define la estacionalidad de eventos por producto a lo largo del año.

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
   - from_classification_a: Cantidad de eventos desde ciudades A
   - from_classification_b: Cantidad de eventos desde ciudades B
   - from_classification_c: Cantidad de eventos desde ciudades C
   
   USO: Use este formato para importar masivamente requisitos de asignación.
        Complete con los códigos de ciudad existentes y las cantidades deseadas.

NOTAS IMPORTANTES:
- Todos los totales deben ser coherentes entre ciudades origen y destino
- Los porcentajes de estacionalidad deben sumar exactamente 100%
- Los códigos de ciudad deben existir previamente en el sistema
- La suma de eventos debe coincidir con el número total de nodos disponibles


═══════════════════════════════════════════════════════════════
ALLOCATION PLAN FILES DOCUMENTATION
═══════════════════════════════════════════════════════════════

1. City_Allocation_Requirements_${selectedYear}.csv
   
   DESCRIPTION: City event allocation requirements
   COLUMNS:
   - ciudad_codigo: Unique destination city code
   - ciudad_nombre: Destination city name
   - clasificacion: City classification (A, B, or C)
   - from_classification_a: Number of events that must arrive from type A cities
   - from_classification_b: Number of events that must arrive from type B cities
   - from_classification_c: Number of events that must arrive from type C cities
   - total_incoming: Total events that must arrive to this city combining all cities
   
   USE: This file shows how many events each city needs to receive by classification during the period.

2. Product_Seasonality_Plan_${selectedYear}.csv
   
   DESCRIPTION: Monthly percentage distribution by product
   COLUMNS:
   - producto_codigo: Unique product code
   - producto_nombre: Product name
   - jan_percentage to dec_percentage: Event distribution percentage by product for each month (must sum to 100%)
   
   USE: Defines product event seasonality throughout the year.

3. Current_Allocation_Plan_${selectedYear}.csv
   
   DESCRIPTION: Current node and panelist allocation status
   COLUMNS:
   - nodo_codigo: Node code
   - ciudad_codigo: Node city code
   - ciudad_nombre: City name
   - clasificacion: City classification
   - panelista_asignado: Indicates if node has assigned panelist (Yes/No)
   
   USE: Shows current allocation situation to compare with target plan.

4. Import_Format_Template_${selectedYear}.csv
   
   DESCRIPTION: Template to import city allocation requirements
   COLUMNS:
   - ciudad_codigo: City code (must exist in system)
   - from_classification_a: Number of events from A cities
   - from_classification_b: Number of events from B cities
   - from_classification_c: Number of events from C cities
   
   USE: Use this format to massively import allocation requirements.
        Fill with existing city codes and desired quantities.

IMPORTANT NOTES:
- All totals must be consistent between source and destination cities
- Seasonality percentages must sum exactly to 100%
- City codes must previously exist in the system
- Event sum must match total number of available nodes


═══════════════════════════════════════════════════════════════
DOCUMENTATION DES FICHIERS DU PLAN D'ALLOCATION
═══════════════════════════════════════════════════════════════

1. City_Allocation_Requirements_${selectedYear}.csv
   
   DESCRIPTION: Besoins d'allocation d'événements par ville
   COLONNES:
   - ciudad_codigo: Code unique de la ville de destination
   - ciudad_nombre: Nom de la ville de destination
   - clasificacion: Classification de la ville (A, B ou C)
   - from_classification_a: Nombre d'événements devant arriver des villes de type A
   - from_classification_b: Nombre d'événements devant arriver des villes de type B
   - from_classification_c: Nombre d'événements devant arriver des villes de type C
   - total_incoming: Total d'événements devant arriver à cette ville en combinant toutes les villes
   
   UTILISATION: Ce fichier montre combien d'événements chaque ville doit recevoir selon les classifications pendant la période.

2. Product_Seasonality_Plan_${selectedYear}.csv
   
   DESCRIPTION: Distribution en pourcentage mensuel par produit
   COLONNES:
   - producto_codigo: Code unique du produit
   - producto_nombre: Nom du produit
   - jan_percentage à dec_percentage: Pourcentage de distribution d'événements par produit pour chaque mois (doit totaliser 100%)
   
   UTILISATION: Définit la saisonnalité des événements par produit tout au long de l'année.

3. Current_Allocation_Plan_${selectedYear}.csv
   
   DESCRIPTION: État actuel de l'allocation des nœuds et panélistes
   COLONNES:
   - nodo_codigo: Code du nœud
   - ciudad_codigo: Code de la ville du nœud
   - ciudad_nombre: Nom de la ville
   - clasificacion: Classification de la ville
   - panelista_asignado: Indique si le nœud a un panéliste assigné (Oui/Non)
   
   UTILISATION: Montre la situation actuelle des allocations pour comparer avec le plan objectif.

4. Import_Format_Template_${selectedYear}.csv
   
   DESCRIPTION: Modèle pour importer les besoins d'allocation de villes
   COLONNES:
   - ciudad_codigo: Code de la ville (doit exister dans le système)
   - from_classification_a: Nombre d'événements depuis les villes A
   - from_classification_b: Nombre d'événements depuis les villes B
   - from_classification_c: Nombre d'événements depuis les villes C
   
   UTILISATION: Utilisez ce format pour importer massivement les besoins d'allocation.
                Complétez avec les codes de ville existants et les quantités désirées.

NOTES IMPORTANTES:
- Tous les totaux doivent être cohérents entre villes source et destination
- Les pourcentages de saisonnalité doivent totaliser exactement 100%
- Les codes de ville doivent exister préalablement dans le système
- La somme des événements doit correspondre au nombre total de nœuds disponibles
`;

      // Create ZIP file
      const zip = new JSZip();
      const timestamp = new Date().toISOString().split('T')[0];
      
      zip.file(`City_Allocation_Requirements_${selectedYear}_${timestamp}.csv`, cityCSVString);
      zip.file(`Product_Seasonality_Plan_${selectedYear}_${timestamp}.csv`, productCSVString);
      zip.file(`Current_Allocation_Plan_${selectedYear}_${timestamp}.csv`, currentAllocationCSVString);
      zip.file(`Import_Format_Template_${selectedYear}_${timestamp}.csv`, importTemplateCSVString);
      zip.file(`Documentation_${selectedYear}_${timestamp}.txt`, documentation);

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
              <span><strong>City_Allocation_Requirements.csv:</strong> Requisitos de eventos de asignación por ciudad</span>
            </p>
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Product_Seasonality_Plan.csv:</strong> Distribución porcentual de eventos por producto mensual</span>
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
              <span><strong>Documentation.txt:</strong> Documentación detallada en 3 idiomas (ES/EN/FR)</span>
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
