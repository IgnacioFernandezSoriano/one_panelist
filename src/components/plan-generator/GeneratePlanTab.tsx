import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
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
  const { t } = useTranslation();
  
  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const savedYear = localStorage.getItem('planGeneratorYear');
    return savedYear ? parseInt(savedYear) : new Date().getFullYear();
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const [summary, setSummary] = useState({
    citiesConfigured: 0,
    productsConfigured: 0,
    currentEvents: 0,
  });

  // Load from localStorage
  const [options, setOptions] = useState(() => {
    const savedOptions = localStorage.getItem('planGeneratorOptions');
    return savedOptions ? JSON.parse(savedOptions) : {
      includeEvents: true,
      applySeasonality: true,
      applyCityWeights: true,
    };
  });

  useEffect(() => {
    initializeData();
  }, []);

  // Sync clienteId with selectedCliente for non-superadmin users
  useEffect(() => {
    if (!isSuperAdmin() && clienteId && selectedCliente !== clienteId) {
      setSelectedCliente(clienteId);
    }
  }, [clienteId, isSuperAdmin]);

  useEffect(() => {
    if (selectedCliente) {
      fetchSummary(selectedCliente);
    }
  }, [selectedCliente, selectedYear]);

  // Persist selectedYear to localStorage
  useEffect(() => {
    localStorage.setItem('planGeneratorYear', selectedYear.toString());
  }, [selectedYear]);

  // Persist options to localStorage
  useEffect(() => {
    localStorage.setItem('planGeneratorOptions', JSON.stringify(options));
  }, [options]);

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

      // Fetch nodes grouped by city for topology
      const { data: nodos } = await supabase
        .from("nodos")
        .select(`
          codigo,
          ciudad,
          ciudad_id,
          estado,
          ciudades!inner(codigo, nombre)
        `)
        .eq("cliente_id", selectedCliente)
        .eq("estado", "activo");

      if (!cityAllocations || !allCities || !productSeasonality || !products) {
        throw new Error("Failed to fetch data");
      }

      // Create product lookup map
      const productMap = new Map(products.map(p => [p.id, p]));

      // Calculate incoming allocations for each city
      const cityIncomingMap = new Map();
      
      // Count cities by classification
      const cityCountByClassification = {
        A: allCities.filter(c => c.clasificacion === 'A').length,
        B: allCities.filter(c => c.clasificacion === 'B').length,
        C: allCities.filter(c => c.clasificacion === 'C').length,
      };
      
      allCities.forEach(targetCity => {
        // Find the configuration for this target city
        const targetRequirements = cityAllocations.find(
          ca => ca.ciudad_id === targetCity.id
        );

        if (!targetRequirements) {
          // If no requirements configured, set zeros
          cityIncomingMap.set(targetCity.id, {
            codigo: targetCity.codigo,
            nombre: targetCity.nombre,
            clasificacion: targetCity.clasificacion,
            from_a: 0,
            from_b: 0,
            from_c: 0,
            total: 0,
          });
          return;
        }

        // Counts of origin cities by classification, excluding the target city itself
        const countA = cityCountByClassification.A - (targetCity.clasificacion === 'A' ? 1 : 0);
        const countB = cityCountByClassification.B - (targetCity.clasificacion === 'B' ? 1 : 0);
        const countC = cityCountByClassification.C - (targetCity.clasificacion === 'C' ? 1 : 0);

        // Use configured per-origin-city values for columns
        const fromAConfig = targetRequirements.from_classification_a || 0;
        const fromBConfig = targetRequirements.from_classification_b || 0;
        const fromCConfig = targetRequirements.from_classification_c || 0;

        // Total incoming = configured values * number of origin cities of each class
        const totalIncoming = (fromAConfig * countA) + (fromBConfig * countB) + (fromCConfig * countC);

        cityIncomingMap.set(targetCity.id, {
          codigo: targetCity.codigo,
          nombre: targetCity.nombre,
          clasificacion: targetCity.clasificacion,
          from_a: fromAConfig,
          from_b: fromBConfig,
          from_c: fromCConfig,
          total: totalIncoming,
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

      // Generate CSV 3: Topology (nodes per city)
      const nodosGroupedByCity = new Map();
      
      nodos?.forEach(nodo => {
        const cityKey = nodo.ciudad_id;
        if (!nodosGroupedByCity.has(cityKey)) {
          nodosGroupedByCity.set(cityKey, {
            ciudad_codigo: nodo.ciudades.codigo,
            ciudad_nombre: nodo.ciudades.nombre,
            total_nodos: 0,
            nodos_activos: 0,
            codigos_nodos: []
          });
        }
        const cityData = nodosGroupedByCity.get(cityKey);
        cityData.total_nodos += 1;
        if (nodo.estado === 'activo') {
          cityData.nodos_activos += 1;
        }
        cityData.codigos_nodos.push(nodo.codigo);
      });

      const topologyCSV = Array.from(nodosGroupedByCity.values()).map(city => ({
        ciudad_codigo: city.ciudad_codigo,
        ciudad_nombre: city.ciudad_nombre,
        total_nodos: city.total_nodos,
        nodos_activos: city.nodos_activos,
        codigos_nodos: city.codigos_nodos.join(', ')
      }));
      const topologyCSVString = Papa.unparse(topologyCSV);

      // Generate CSV 4: Current Allocation Plan (from envios table - same as Export Allocation Plan button)
      const { data: envios } = await supabase
        .from("envios")
        .select(`
          id,
          clientes!inner(codigo, nombre),
          productos_cliente(codigo_producto, nombre_producto),
          tipo_producto,
          carriers(carrier_code, legal_name),
          carrier_name,
          nodo_origen,
          panelista_origen:panelistas!envios_panelista_origen_id_fkey(nombre_completo),
          nodo_destino,
          panelista_destino:panelistas!envios_panelista_destino_id_fkey(nombre_completo),
          fecha_programada,
          fecha_limite,
          estado,
          numero_etiqueta,
          fecha_envio_real,
          fecha_recepcion_real,
          tiempo_transito_dias
        `)
        .eq("cliente_id", selectedCliente)
        .gte("fecha_creacion", new Date(selectedYear, 0, 1).toISOString())
        .lt("fecha_creacion", new Date(selectedYear + 1, 0, 1).toISOString())
        .order("fecha_programada", { ascending: false });

      const currentAllocationCSV = envios?.map(envio => ({
        id: envio.id,
        cliente_codigo: envio.clientes?.codigo || '',
        cliente_nombre: envio.clientes?.nombre || '',
        producto_codigo: envio.productos_cliente?.codigo_producto || '',
        producto_nombre: envio.productos_cliente?.nombre_producto || '',
        tipo_producto: envio.tipo_producto || '',
        carrier_code: envio.carriers?.carrier_code || '',
        carrier_name: envio.carriers?.legal_name || envio.carrier_name || '',
        nodo_origen: envio.nodo_origen,
        panelista_origen: (envio.panelista_origen as any)?.nombre_completo || '',
        nodo_destino: envio.nodo_destino,
        panelista_destino: (envio.panelista_destino as any)?.nombre_completo || '',
        fecha_programada: envio.fecha_programada,
        fecha_limite: envio.fecha_limite || '',
        estado: envio.estado,
        numero_etiqueta: envio.numero_etiqueta || '',
        fecha_envio_real: envio.fecha_envio_real || '',
        fecha_recepcion_real: envio.fecha_recepcion_real || '',
        tiempo_transito_dias: envio.tiempo_transito_dias || ''
      })) || [];
      const currentAllocationCSVString = Papa.unparse(currentAllocationCSV);

      // Generate CSV 4: Import Format Template (same format as Download Template button in Envios page)
      const importTemplateCSV = [
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
        {
          cliente_id: "1",
          carrier_id: "2",
          producto_id: "3",
          panelista_origen_id: "10",
          panelista_destino_id: "12",
          nodo_origen: "BCN",
          nodo_destino: "VLC",
          fecha_programada: "2025-01-20",
          tipo_producto: "package",
          estado: "PENDING",
          motivo_creacion: "scheduled"
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

3. Topology.csv
   
   DESCRIPCIÓN: Topología de nodos por ciudad
   COLUMNAS:
   - ciudad_codigo: Código único de la ciudad
   - ciudad_nombre: Nombre de la ciudad
   - total_nodos: Número total de nodos en la ciudad
   - nodos_activos: Número de nodos activos en la ciudad
   - codigos_nodos: Lista de códigos de todos los nodos en la ciudad
   
   USO: Este archivo muestra la distribución de nodos por ciudad para entender la infraestructura disponible.

4. Current_Allocation_Plan_${selectedYear}.csv
   
   DESCRIPCIÓN: Eventos de asignación actuales (igual que el botón Export Allocation Plan)
   COLUMNAS:
   - id: ID del evento
   - cliente_codigo: Código del cliente
   - cliente_nombre: Nombre del cliente
   - producto_codigo: Código del producto
   - producto_nombre: Nombre del producto
   - tipo_producto: Tipo de producto
   - carrier_code: Código del carrier
   - carrier_name: Nombre del carrier
   - nodo_origen: Código del nodo origen
   - panelista_origen: Nombre del panelista origen
   - nodo_destino: Código del nodo destino
   - panelista_destino: Nombre del panelista destino
   - fecha_programada: Fecha programada del envío
   - fecha_limite: Fecha límite
   - estado: Estado del evento
   - numero_etiqueta: Número de etiqueta
   - fecha_envio_real: Fecha real de envío
   - fecha_recepcion_real: Fecha real de recepción
   - tiempo_transito_dias: Tiempo de tránsito en días
   
   USO: Muestra todos los eventos de asignación actuales del año para comparar con el plan objetivo.

5. Import_Format_Template_${selectedYear}.csv
   
   DESCRIPCIÓN: Plantilla para importar eventos de asignación (igual que el botón Download Template)
   COLUMNAS:
   - cliente_id: ID del cliente (debe existir en el sistema)
   - carrier_id: ID del carrier (debe existir en el sistema)
   - producto_id: ID del producto (debe existir en el sistema)
   - panelista_origen_id: ID del panelista origen (debe existir en el sistema)
   - panelista_destino_id: ID del panelista destino (debe existir en el sistema)
   - nodo_origen: Código del nodo origen (debe existir en el sistema)
   - nodo_destino: Código del nodo destino (debe existir en el sistema)
   - fecha_programada: Fecha programada del envío (formato: YYYY-MM-DD)
   - tipo_producto: Tipo de producto (e.g., letter, package)
   - estado: Estado del evento (e.g., PENDING, IN_TRANSIT)
   - motivo_creacion: Motivo de creación (e.g., scheduled, urgent)
   
   USO: Use este formato para importar masivamente eventos de asignación.
        Complete con los IDs y códigos existentes en el sistema.

NOTAS IMPORTANTES:
- City_Allocation_Requirements: Las columnas From A/B/C reflejan exactamente los valores configurados en la tabla (requisito por ciudad emisora). El campo Total_incoming se calcula como:
  (From A x nº de ciudades A emisoras) + (From B x nº de ciudades B emisoras) + (From C x nº de ciudades C emisoras), excluyendo la propia ciudad si coincide con la clasificación.
  EJEMPLO:
  Barcelona (A) configurada con From A=50, From B=20, From C=5.
  Ciudades: Madrid (A), Girona (B), La Palma (B), Boadilla (C) y Barcelona (A).
  Total_incoming = 50 x (2 A - 1) + 20 x (2 B) + 5 x (1 C) = 50 + 40 + 5 = 95.
  
- Current_Allocation_Plan: Muestra todos los eventos de asignación reales creados durante
  el año seleccionado (exportación idéntica al botón "Export Allocation Plan").
  
- Import_Format_Template: Use este formato para crear nuevos eventos de asignación.
  
  CAMPOS OBLIGATORIOS (no pueden estar vacíos):
  • cliente_id: ID del cliente (debe existir en tabla clientes)
  • nodo_origen: Código del nodo origen (debe existir en tabla nodos)
  • nodo_destino: Código del nodo destino (debe existir en tabla nodos)
  • fecha_programada: Fecha programada del envío (formato: YYYY-MM-DD)
  • motivo_creacion: Motivo de creación del envío (texto libre)
  
  CAMPOS OPCIONALES (pueden dejarse vacíos):
  • panelista_origen_id: ID del panelista origen (recomendado si existe)
  • panelista_destino_id: ID del panelista destino (recomendado si existe)
  • carrier_id: ID del carrier (si se asigna carrier)
  • producto_id: ID del producto (si se especifica producto)
  • tipo_producto: Tipo de producto (texto libre)
  • estado: Estado del envío (si no se especifica, será 'PENDING' por defecto)
  • numero_etiqueta: Número de etiqueta del envío
  
- Los porcentajes de estacionalidad deben sumar exactamente 100% por producto.


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

3. Topology.csv
   
   DESCRIPTION: Node topology by city
   COLUMNS:
   - ciudad_codigo: Unique city code
   - ciudad_nombre: City name
   - total_nodos: Total number of nodes in the city
   - nodos_activos: Number of active nodes in the city
   - codigos_nodos: List of all node codes in the city
   
   USE: This file shows the distribution of nodes per city to understand available infrastructure.

4. Current_Allocation_Plan_${selectedYear}.csv
   
   DESCRIPTION: Current allocation events (same as Export Allocation Plan button)
   COLUMNS:
   - id: Event ID
   - cliente_codigo: Client code
   - cliente_nombre: Client name
   - producto_codigo: Product code
   - producto_nombre: Product name
   - tipo_producto: Product type
   - carrier_code: Carrier code
   - carrier_name: Carrier name
   - nodo_origen: Origin node code
   - panelista_origen: Origin panelist name
   - nodo_destino: Destination node code
   - panelista_destino: Destination panelist name
   - fecha_programada: Scheduled date
   - fecha_limite: Deadline date
   - estado: Event status
   - numero_etiqueta: Label number
   - fecha_envio_real: Actual shipping date
   - fecha_recepcion_real: Actual reception date
   - tiempo_transito_dias: Transit time in days
   
   USE: Shows all current year allocation events to compare with target plan.

5. Import_Format_Template_${selectedYear}.csv
   
   DESCRIPTION: Template to import allocation events (same as Download Template button)
   COLUMNS:
   - cliente_id: Client ID (must exist in system)
   - carrier_id: Carrier ID (must exist in system)
   - producto_id: Product ID (must exist in system)
   - panelista_origen_id: Origin panelist ID (must exist in system)
   - panelista_destino_id: Destination panelist ID (must exist in system)
   - nodo_origen: Origin node code (must exist in system)
   - nodo_destino: Destination node code (must exist in system)
   - fecha_programada: Scheduled date (format: YYYY-MM-DD)
   - tipo_producto: Product type (e.g., letter, package)
   - estado: Event status (e.g., PENDING, IN_TRANSIT)
   - motivo_creacion: Creation reason (e.g., scheduled, urgent)
   
   USE: Use this format to massively import allocation events.
        Fill with existing IDs and codes in the system.

IMPORTANT NOTES:
- City_Allocation_Requirements: The From A/B/C columns reflect exactly the configured values (requirement per origin city). The Total_incoming is computed as:
  (From A x number of A origin cities) + (From B x number of B origin cities) + (From C x number of C origin cities), excluding the destination city itself if it shares the classification.
  EXAMPLE:
  Barcelona (A) configured with From A=50, From B=20, From C=5.
  Cities: Madrid (A), Girona (B), La Palma (B), Boadilla (C) and Barcelona (A).
  Total_incoming = 50 x (2 A - 1) + 20 x (2 B) + 5 x (1 C) = 50 + 40 + 5 = 95.
  
- Current_Allocation_Plan: Shows all real allocation events created during the selected year
  (identical export to "Export Allocation Plan" button).
  
- Import_Format_Template: Use this format to create new allocation events.
  
  REQUIRED FIELDS (cannot be empty):
  • cliente_id: Client ID (must exist in clientes table)
  • nodo_origen: Origin node code (must exist in nodos table)
  • nodo_destino: Destination node code (must exist in nodos table)
  • fecha_programada: Scheduled shipment date (format: YYYY-MM-DD)
  • motivo_creacion: Creation reason (free text)
  
  OPTIONAL FIELDS (can be left empty):
  • panelista_origen_id: Origin panelist ID (recommended if exists)
  • panelista_destino_id: Destination panelist ID (recommended if exists)
  • carrier_id: Carrier ID (if assigning carrier)
  • producto_id: Product ID (if specifying product)
  • tipo_producto: Product type (free text)
  • estado: Shipment status (if not specified, defaults to 'PENDING')
  • numero_etiqueta: Shipment label number
  
- Seasonality percentages must sum exactly to 100% per product.


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

3. Topology.csv
   
   DESCRIPTION: Topologie des nœuds par ville
   COLONNES:
   - ciudad_codigo: Code unique de la ville
   - ciudad_nombre: Nom de la ville
   - total_nodos: Nombre total de nœuds dans la ville
   - nodos_activos: Nombre de nœuds actifs dans la ville
   - codigos_nodos: Liste de tous les codes de nœuds dans la ville
   
   UTILISATION: Ce fichier montre la distribution des nœuds par ville pour comprendre l'infrastructure disponible.

4. Current_Allocation_Plan_${selectedYear}.csv
   
   DESCRIPTION: État actuel des événements d'allocation (identique au bouton Export Allocation Plan)
   COLONNES:
   - id: ID de l'événement
   - cliente_codigo: Code client
   - cliente_nombre: Nom du client
   - producto_codigo: Code produit
   - producto_nombre: Nom du produit
   - tipo_producto: Type de produit
   - carrier_code: Code transporteur
   - carrier_name: Nom du transporteur
   - nodo_origen: Code nœud d'origine
   - panelista_origen: Nom du panéliste d'origine
   - nodo_destino: Code nœud de destination
   - panelista_destino: Nom du panéliste de destination
   - fecha_programada: Date programmée
   - fecha_limite: Date limite
   - estado: Statut de l'événement
   - numero_etiqueta: Numéro d'étiquette
   - fecha_envio_real: Date réelle d'expédition
   - fecha_recepcion_real: Date réelle de réception
   - tiempo_transito_dias: Temps de transit en jours
   
   UTILISATION: Montre tous les événements d'allocation de l'année en cours pour comparer avec le plan objectif.

5. Import_Format_Template_${selectedYear}.csv
   
   DESCRIPTION: Modèle pour importer des événements d'allocation (identique au bouton Download Template)
   COLONNES:
   - cliente_id: ID client (doit exister dans le système)
   - carrier_id: ID transporteur (doit exister dans le système)
   - producto_id: ID produit (doit exister dans le système)
   - panelista_origen_id: ID panéliste origine (doit exister dans le système)
   - panelista_destino_id: ID panéliste destination (doit exister dans le système)
   - nodo_origen: Code nœud origine (doit exister dans le système)
   - nodo_destino: Code nœud destination (doit exister dans le système)
   - fecha_programada: Date programmée (format: YYYY-MM-DD)
   - tipo_producto: Type de produit (ex: letter, package)
   - estado: Statut de l'événement (ex: PENDING, IN_TRANSIT)
   - motivo_creacion: Raison de création (ex: scheduled, urgent)
   
   UTILISATION: Utilisez ce format pour importer massivement des événements d'allocation.
                Complétez avec les IDs et codes existants dans le système.

NOTES IMPORTANTES:
- City_Allocation_Requirements: Les valeurs affichées sont exactement telles que configurées dans la table.
  EXEMPLE DE LOGIQUE:
  Barcelone (classification A) est configurée avec: From A=50, From B=20, From C=5
  Cela signifie que Barcelone doit recevoir 50 envois des villes de type A, 20 de type B et 5 de type C.
  Si Madrid Capital est de type A, alors Madrid doit envoyer 50 événements à Barcelone.
  Si Gérone et La Palma sont de type B, alors chacune doit envoyer 20 événements à Barcelone.
  Le total des événements reçus par Barcelone sera: 50 (Madrid) + 20 (Gérone) + 20 (La Palma) + 5 (Boadilla) = 95
  
- Current_Allocation_Plan: Affiche tous les événements d'allocation réels créés pendant l'année
  sélectionnée (exportation identique au bouton "Export Allocation Plan").
  
- Import_Format_Template: Utilisez ce format pour créer de nouveaux événements d'allocation.
  
  CHAMPS OBLIGATOIRES (ne peuvent pas être vides):
  • cliente_id: ID du client (doit exister dans la table clientes)
  • nodo_origen: Code du nœud d'origine (doit exister dans la table nodos)
  • nodo_destino: Code du nœud de destination (doit exister dans la table nodos)
  • fecha_programada: Date programmée de l'envoi (format: YYYY-MM-DD)
  • motivo_creacion: Motif de création de l'envoi (texte libre)
  
  CHAMPS OPTIONNELS (peuvent être laissés vides):
  • panelista_origen_id: ID du panéliste d'origine (recommandé s'il existe)
  • panelista_destino_id: ID du panéliste de destination (recommandé s'il existe)
  • carrier_id: ID du transporteur (si un transporteur est assigné)
  • producto_id: ID du produit (si un produit est spécifié)
  • tipo_producto: Type de produit (texte libre)
  • estado: Statut de l'envoi (si non spécifié, sera 'PENDING' par défaut)
  • numero_etiqueta: Numéro d'étiquette de l'envoi
  
- Les pourcentages de saisonnalité doivent totaliser exactement 100% par produit.
`;

      // Create ZIP file
      const zip = new JSZip();
      
      zip.file(`City_Allocation_Requirements_${selectedYear}.csv`, cityCSVString);
      zip.file(`Product_Seasonality_Plan_${selectedYear}.csv`, productCSVString);
      zip.file(`Topology.csv`, topologyCSVString);
      zip.file(`Current_Allocation_Plan_${selectedYear}.csv`, currentAllocationCSVString);
      zip.file(`Import_Format_Template_${selectedYear}.csv`, importTemplateCSVString);
      zip.file(`Documentation.txt`, documentation);

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Allocation_Plan_${selectedYear}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: t('common.success'),
        description: t('plan_generator.plan_generated_success'),
      });
    } catch (error) {
      console.error("Error generating plan:", error);
      toast({
        title: t('common.error'),
        description: t('plan_generator.plan_generation_error'),
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
          <CardTitle>{t('plan_generator.configuration')}</CardTitle>
          <CardDescription>{t('plan_generator.configuration_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSuperAdmin() && (
            <div className="space-y-2">
              <Label>{t('common.client')}</Label>
              <Select
                value={selectedCliente?.toString()}
                onValueChange={(value) => setSelectedCliente(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select_client')} />
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
            <Label>{t('plan_generator.year')}</Label>
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
                {t('plan_generator.include_current_events')}
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
                {t('plan_generator.apply_seasonality')}
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
                {t('plan_generator.apply_city_weights')}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('plan_generator.cities_configured')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.citiesConfigured}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('plan_generator.cities_with_requirements')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('plan_generator.products_configured')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.productsConfigured}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('plan_generator.products_with_seasonality')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('plan_generator.current_events')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.currentEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('plan_generator.events_in_year')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('plan_generator.generate_plan')}</CardTitle>
          <CardDescription>
            {t('plan_generator.download_plan_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>City_Allocation_Requirements.csv:</strong> {t('plan_generator.city_requirements_desc')}</span>
            </p>
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Product_Seasonality_Plan.csv:</strong> {t('plan_generator.seasonality_desc')}</span>
            </p>
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Topology.csv:</strong> {t('plan_generator.topology_desc')}</span>
            </p>
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Current_Allocation_Plan.csv:</strong> {t('plan_generator.current_allocation_desc')}</span>
            </p>
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Import_Format_Template.csv:</strong> {t('plan_generator.import_template_desc')}</span>
            </p>
            <p className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Documentation.txt:</strong> {t('plan_generator.documentation_desc')}</span>
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
                {t('plan_generator.generating')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('plan_generator.generate_download')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
