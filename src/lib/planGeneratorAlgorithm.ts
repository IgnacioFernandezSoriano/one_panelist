import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format, getMonth, addMonths, startOfMonth, endOfMonth, startOfDay, addDays, getYear, getWeek, parseISO } from "date-fns";

export interface PlanConfig {
  cliente_id: number;
  carrier_id: number;
  producto_id: number;
  start_date: Date;
  end_date: Date;
  total_events: number;
  max_events_per_week: number;
  merge_strategy: 'add' | 'replace';
  created_by: number;
}

export interface GeneratedEvent {
  nodo_origen: string;
  nodo_destino: string;
  fecha_programada: string;
}

export interface UnassignedCity {
  ciudad_id: number;
  ciudad_nombre: string;
  unassigned_count: number;
}

interface ClassificationMatrix {
  destination_classification: 'A' | 'B' | 'C';
  percentage_from_a: number;
  percentage_from_b: number;
  percentage_from_c: number;
}

interface CityInfo {
  ciudad_id: number;
  ciudad_nombre: string;
  ciudad_codigo: string;
  clasificacion: 'A' | 'B' | 'C';
}

interface Node {
  codigo: string;
  ciudad_id: number;
  region_id: number;
  clasificacion: 'A' | 'B' | 'C';
  estado: string;
}

interface SeasonalityData {
  january_percentage: number;
  february_percentage: number;
  march_percentage: number;
  april_percentage: number;
  may_percentage: number;
  june_percentage: number;
  july_percentage: number;
  august_percentage: number;
  september_percentage: number;
  october_percentage: number;
  november_percentage: number;
  december_percentage: number;
}

export async function validateCarrierProduct(carrier_id: number, producto_id: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('carrier_productos' as any)
    .select('id')
    .eq('carrier_id', carrier_id)
    .eq('producto_id', producto_id)
    .maybeSingle();

  return !error && !!data;
}

async function loadClassificationMatrix(cliente_id: number): Promise<ClassificationMatrix[]> {
  const { data, error } = await supabase
    .from('classification_allocation_matrix')
    .select('*')
    .eq('cliente_id', cliente_id)
    .order('destination_classification');

  if (error) {
    console.error('Error loading classification matrix:', error);
    throw new Error('Failed to load classification matrix');
  }

  if (!data || data.length === 0) {
    // Return default matrix if none exists (sum to 100%)
    return [
      { destination_classification: 'A', percentage_from_a: 11.11, percentage_from_b: 11.11, percentage_from_c: 11.12 },
      { destination_classification: 'B', percentage_from_a: 11.11, percentage_from_b: 11.11, percentage_from_c: 11.12 },
      { destination_classification: 'C', percentage_from_a: 11.11, percentage_from_b: 11.11, percentage_from_c: 11.12 },
    ];
  }

  return data as ClassificationMatrix[];
}

async function loadCityInfo(cliente_id: number): Promise<CityInfo[]> {
  const { data, error } = await supabase
    .from('ciudades')
    .select('id, nombre, codigo, clasificacion')
    .eq('cliente_id', cliente_id)
    .eq('estado', 'activo');

  if (error) {
    console.error('Error loading cities:', error);
    throw new Error('Failed to load cities');
  }

  return (data || []).map(city => ({
    ciudad_id: city.id,
    ciudad_nombre: city.nombre,
    ciudad_codigo: city.codigo,
    clasificacion: city.clasificacion as 'A' | 'B' | 'C',
  }));
}

async function loadProductSeasonality(cliente_id: number, producto_id: number, year: number): Promise<SeasonalityData> {
  const { data, error } = await supabase
    .from('product_seasonality')
    .select('*')
    .eq('cliente_id', cliente_id)
    .eq('producto_id', producto_id)
    .eq('year', year)
    .maybeSingle();

  if (error || !data) {
    const defaultValue = 8.33;
    return {
      january_percentage: defaultValue,
      february_percentage: defaultValue,
      march_percentage: defaultValue,
      april_percentage: defaultValue,
      may_percentage: defaultValue,
      june_percentage: defaultValue,
      july_percentage: defaultValue,
      august_percentage: defaultValue,
      september_percentage: 8.34,
      october_percentage: 8.34,
      november_percentage: 8.34,
      december_percentage: 8.34,
    };
  }

  return {
    january_percentage: data.january_percentage || 0,
    february_percentage: data.february_percentage || 0,
    march_percentage: data.march_percentage || 0,
    april_percentage: data.april_percentage || 0,
    may_percentage: data.may_percentage || 0,
    june_percentage: data.june_percentage || 0,
    july_percentage: data.july_percentage || 0,
    august_percentage: data.august_percentage || 0,
    september_percentage: data.september_percentage || 0,
    october_percentage: data.october_percentage || 0,
    november_percentage: data.november_percentage || 0,
    december_percentage: data.december_percentage || 0,
  };
}

async function loadTopology(cliente_id: number): Promise<Node[]> {
  const { data, error } = await supabase
    .from('nodos')
    .select(`
      codigo,
      estado,
      panelistas!inner (
        availability_status
      ),
      ciudades (
        id,
        region_id,
        clasificacion
      )
    `)
    .eq('cliente_id', cliente_id)
    .eq('panelistas.availability_status', 'active');

  if (error) throw error;

  return (data || []).map((row: any) => ({
    codigo: row.codigo,
    ciudad_id: row.ciudades?.id,
    region_id: row.ciudades?.region_id,
    clasificacion: row.ciudades?.clasificacion || 'C',
    estado: row.estado || 'activo'
  }));
}

function getMonthsInRange(startDate: Date, endDate: Date): Date[] {
  const months: Date[] = [];
  let current = startOfMonth(startDate);
  const end = startOfMonth(endDate);

  while (current <= end) {
    months.push(current);
    current = addMonths(current, 1);
  }

  return months;
}

function getSeasonalityPercentage(seasonality: SeasonalityData, month: number): number {
  const monthNames: (keyof SeasonalityData)[] = [
    'january_percentage', 'february_percentage', 'march_percentage', 
    'april_percentage', 'may_percentage', 'june_percentage',
    'july_percentage', 'august_percentage', 'september_percentage', 
    'october_percentage', 'november_percentage', 'december_percentage'
  ];
  return seasonality[monthNames[month]] || 0;
}

function distributeByMonth(
  totalEvents: number,
  seasonality: SeasonalityData,
  startDate: Date,
  endDate: Date
): Record<string, number> {
  const result: Record<string, number> = {};
  const monthsInPeriod = getMonthsInRange(startDate, endDate);
  
  const totalWeight = monthsInPeriod.reduce((sum, month) => {
    const percentage = getSeasonalityPercentage(seasonality, getMonth(month));
    return sum + percentage;
  }, 0);

  monthsInPeriod.forEach(month => {
    const monthKey = format(month, 'yyyy-MM');
    const percentage = getSeasonalityPercentage(seasonality, getMonth(month));
    result[monthKey] = Math.ceil((totalEvents * percentage) / totalWeight);
  });

  return result;
}

function distributeByCitiesAndClassification(
  monthlyEvents: number,
  classificationMatrix: ClassificationMatrix[],
  cityInfo: CityInfo[]
): Record<number, { from_a: number; from_b: number; from_c: number }> {
  const result: Record<number, { from_a: number; from_b: number; from_c: number }> = {};

  // Group cities by classification
  const citiesByType: Record<'A' | 'B' | 'C', CityInfo[]> = {
    A: cityInfo.filter(c => c.clasificacion === 'A'),
    B: cityInfo.filter(c => c.clasificacion === 'B'),
    C: cityInfo.filter(c => c.clasificacion === 'C'),
  };

  const totalCities = cityInfo.length;
  if (totalCities === 0) return result;

  // For each destination type, calculate absolute events from matrix percentages
  (['A', 'B', 'C'] as const).forEach(destType => {
    const matrix = classificationMatrix.find(m => m.destination_classification === destType);
    if (!matrix) return;

    const citiesOfType = citiesByType[destType];
    if (citiesOfType.length === 0) return;

    // Calculate events directly from absolute matrix percentages (without rounding)
    const eventsFromA = (monthlyEvents * matrix.percentage_from_a / 100);
    const eventsFromB = (monthlyEvents * matrix.percentage_from_b / 100);
    const eventsFromC = (monthlyEvents * matrix.percentage_from_c / 100);
    
    const totalEventsForType = eventsFromA + eventsFromB + eventsFromC;
    const eventsPerCity = totalEventsForType / citiesOfType.length;

    citiesOfType.forEach(city => {
      result[city.ciudad_id] = {
        from_a: Math.ceil(eventsPerCity * (eventsFromA / totalEventsForType)),
        from_b: Math.ceil(eventsPerCity * (eventsFromB / totalEventsForType)),
        from_c: Math.ceil(eventsPerCity * (eventsFromC / totalEventsForType)),
      };
    });
  });

  return result;
}

function getRandomDateInMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const randomDay = Math.floor(Math.random() * (endDate.getDate() - startDate.getDate() + 1)) + startDate.getDate();
  return format(new Date(year, month - 1, randomDay), 'yyyy-MM-dd');
}

function selectRandomOriginByClassification(
  topology: Node[],
  classification: 'A' | 'B' | 'C',
  excludeNode: string
): string | null {
  const availableNodes = topology.filter(n =>
    n.clasificacion === classification &&
    n.codigo !== excludeNode &&
    n.estado === 'activo'
  );

  if (availableNodes.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * availableNodes.length);
  return availableNodes[randomIndex].codigo;
}

function getWeekKey(monthKey: string, dateStr: string): string {
  // Parse the date and get the ISO week number
  const date = parseISO(dateStr);
  const weekNum = getWeek(date, { weekStartsOn: 1 }); // Monday as start of week
  const year = date.getFullYear();
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

function balanceBySourceClassification(
  eventsFromA: number,
  eventsFromB: number,
  eventsFromC: number,
  destinationCityId: number,
  destinationNodes: Node[],
  allTopology: Node[],
  maxEventsPerWeek: number,
  monthKey: string
): { assigned: GeneratedEvent[], unassigned: number } {
  const assigned: GeneratedEvent[] = [];
  const weeklyEventCount: Record<string, number> = {};

  // Sort nodes for deterministic sequential filling
  const sortedNodes = [...destinationNodes].sort((a, b) => a.codigo.localeCompare(b.codigo));

  // Helper function to assign events from specific classification using sequential filling
  const assignFromClassification = (
    count: number,
    sourceClassification: 'A' | 'B' | 'C'
  ): number => {
    let assignedCount = 0;
    let nodeIndex = 0;
    let fullLoopAttempts = 0;
    const maxFullLoops = 3;

    // First pass: try to respect capacity limits
    while (assignedCount < count && fullLoopAttempts < maxFullLoops) {
      let progressMade = false;

      // Try all nodes in sequence
      for (let i = 0; i < sortedNodes.length && assignedCount < count; i++) {
        const currentIndex = (nodeIndex + i) % sortedNodes.length;
        const node = sortedNodes[currentIndex];

        // Find origin from specified classification
        const randomOrigin = selectRandomOriginByClassification(
          allTopology,
          sourceClassification,
          node.codigo
        );
        
        if (!randomOrigin) continue;

        // Generate random date for this event
        const eventDate = getRandomDateInMonth(monthKey);
        const weekKey = getWeekKey(monthKey, eventDate);
        const nodeWeekKey = `${weekKey}_${node.codigo}`;
        const currentWeekCount = weeklyEventCount[nodeWeekKey] || 0;

        // Check if node has capacity for this week
        if (currentWeekCount >= maxEventsPerWeek) {
          continue;
        }

        // Assign event to this node
        assigned.push({
          nodo_origen: randomOrigin,
          nodo_destino: node.codigo,
          fecha_programada: eventDate,
        });

        weeklyEventCount[nodeWeekKey] = currentWeekCount + 1;
        assignedCount++;
        progressMade = true;

        // Update node index for next iteration (sequential filling)
        nodeIndex = currentIndex;
      }

      // If no progress was made in a full loop, all nodes are full
      if (!progressMade) {
        fullLoopAttempts++;
      }
    }

    // Second pass: assign remaining events even if exceeding capacity
    // This ensures ALL events are assigned, user can adjust manually later
    while (assignedCount < count) {
      const currentIndex = nodeIndex % sortedNodes.length;
      const node = sortedNodes[currentIndex];

      // Find origin from specified classification
      const randomOrigin = selectRandomOriginByClassification(
        allTopology,
        sourceClassification,
        node.codigo
      );
      
      if (!randomOrigin) {
        // If no origin available, try next node
        nodeIndex++;
        if (nodeIndex >= sortedNodes.length * 2) {
          // Prevent infinite loop if no origins available at all
          console.warn(`Cannot find origin nodes of type ${sourceClassification}, ${count - assignedCount} events unassigned`);
          break;
        }
        continue;
      }

      // Generate random date for this event
      const eventDate = getRandomDateInMonth(monthKey);
      const weekKey = getWeekKey(monthKey, eventDate);
      const nodeWeekKey = `${weekKey}_${node.codigo}`;
      const currentWeekCount = weeklyEventCount[nodeWeekKey] || 0;

      // Assign event regardless of capacity (will be marked as exceeding)
      assigned.push({
        nodo_origen: randomOrigin,
        nodo_destino: node.codigo,
        fecha_programada: eventDate,
      });

      weeklyEventCount[nodeWeekKey] = currentWeekCount + 1;
      assignedCount++;
      nodeIndex++;
    }

    return assignedCount;
  };

  // Assign events from each classification type
  const assignedFromA = assignFromClassification(eventsFromA, 'A');
  const assignedFromB = assignFromClassification(eventsFromB, 'B');
  const assignedFromC = assignFromClassification(eventsFromC, 'C');

  const totalUnassigned = 
    (eventsFromA - assignedFromA) +
    (eventsFromB - assignedFromB) +
    (eventsFromC - assignedFromC);

  return {
    assigned,
    unassigned: totalUnassigned,
  };
}

async function saveDraftPlan(
  config: PlanConfig,
  calculatedEvents: number,
  events: GeneratedEvent[],
  unassignedEvents: number,
  unassignedBreakdown: UnassignedCity[]
) {
  // Generate plan name
  const planName = `Plan ${format(config.start_date, 'MMM yyyy')} - ${format(config.end_date, 'MMM yyyy')}`;

  const { data: plan, error: planError } = await supabase
    .from('generated_allocation_plans' as any)
    .insert({
      cliente_id: config.cliente_id,
      carrier_id: config.carrier_id,
      producto_id: config.producto_id,
      plan_name: planName,
      start_date: format(config.start_date, 'yyyy-MM-dd'),
      end_date: format(config.end_date, 'yyyy-MM-dd'),
      total_events: config.total_events,
      calculated_events: calculatedEvents,
      max_events_per_week: config.max_events_per_week,
      unassigned_events: unassignedEvents,
      unassigned_breakdown: unassignedBreakdown,
      merge_strategy: config.merge_strategy,
      status: 'draft',
      created_by: config.created_by,
      generation_params: {
        algorithm_version: '2.0',
        timestamp: new Date().toISOString()
      }
    })
    .select()
    .single();

  if (planError) throw planError;

  const planId = (plan as any).id;
  const details = events.map(event => ({
    plan_id: planId,
    producto_id: config.producto_id,
    carrier_id: config.carrier_id,
    cliente_id: config.cliente_id,
    ...event
  }));

  if (details.length > 0) {
    const { error: detailsError } = await supabase
      .from('generated_allocation_plan_details' as any)
      .insert(details);

    if (detailsError) throw detailsError;
  }

  return plan;
}

export async function generateIntelligentPlan(config: PlanConfig) {
  // 1. Validate carrier-product association
  const carrierProductExists = await validateCarrierProduct(config.carrier_id, config.producto_id);
  if (!carrierProductExists) {
    throw new Error("Carrier not assigned to this product");
  }

  // 2. Load classification matrix, city info, seasonality, and topology
  const [classificationMatrix, cityInfo, seasonality, topology] = await Promise.all([
    loadClassificationMatrix(config.cliente_id),
    loadCityInfo(config.cliente_id),
    loadProductSeasonality(config.cliente_id, config.producto_id, getYear(config.start_date)),
    loadTopology(config.cliente_id),
  ]);

  if (cityInfo.length === 0) {
    throw new Error("No active cities configured");
  }

  if (topology.length === 0) {
    throw new Error("No active nodes configured");
  }

  // Log capacity warning if max_events_per_week is too low
  if (config.max_events_per_week < 3) {
    console.warn(
      `⚠️ Low capacity detected: ${config.max_events_per_week} events/week = ${config.max_events_per_week * 4} events/month/node. ` +
      `This may result in many unassigned events. Recommended minimum: 3 events/week.`
    );
  }

  // 3. Calculate events based on date range
  const totalDays = differenceInDays(config.end_date, config.start_date) + 1;
  const calculatedEvents = Math.ceil((config.total_events * totalDays) / 365);

  // Calculate theoretical capacity
  const totalWeeks = Math.ceil(differenceInDays(config.end_date, config.start_date) / 7);
  const theoreticalCapacity = topology.length * config.max_events_per_week * totalWeeks;
  console.log(
    `📊 Plan capacity: ${topology.length} nodes × ${config.max_events_per_week} events/week × ${totalWeeks} weeks = ` +
    `${theoreticalCapacity} max events (requested: ${calculatedEvents})`
  );

  // 4. Distribute events by month according to seasonality
  const monthlyDistribution = distributeByMonth(calculatedEvents, seasonality, config.start_date, config.end_date);

  // 5. Balance events across nodes (distribution by city is calculated per month)
  const generatedEvents: GeneratedEvent[] = [];
  const unassignedBreakdown: UnassignedCity[] = [];

  for (const [monthKey, monthEvents] of Object.entries(monthlyDistribution)) {
    // Calculate city distribution for THIS specific month
    const monthlyCityDistribution = distributeByCitiesAndClassification(
      monthEvents,
      classificationMatrix,
      cityInfo
    );

    for (const cityInf of cityInfo) {
      const cityNodes = topology.filter(n => 
        n.ciudad_id === cityInf.ciudad_id && 
        n.estado === 'activo'
      );

      if (cityNodes.length === 0) {
        const allocationBreakdown = monthlyCityDistribution[cityInf.ciudad_id];
        if (allocationBreakdown) {
          const totalUnassigned = allocationBreakdown.from_a + allocationBreakdown.from_b + allocationBreakdown.from_c;
          const existing = unassignedBreakdown.find(u => u.ciudad_id === cityInf.ciudad_id);
          if (existing) {
            existing.unassigned_count += totalUnassigned;
          } else {
            unassignedBreakdown.push({
              ciudad_id: cityInf.ciudad_id,
              ciudad_nombre: cityInf.ciudad_nombre,
              unassigned_count: totalUnassigned,
            });
          }
        }
        continue;
      }

      const allocationBreakdown = monthlyCityDistribution[cityInf.ciudad_id];
      if (!allocationBreakdown) continue;

      // Use the monthly allocation directly (already calculated for this month)
      const result = balanceBySourceClassification(
        allocationBreakdown.from_a,
        allocationBreakdown.from_b,
        allocationBreakdown.from_c,
        cityInf.ciudad_id,
        cityNodes,
        topology,
        config.max_events_per_week,
        monthKey
      );

      generatedEvents.push(...result.assigned);

      if (result.unassigned > 0) {
        const existing = unassignedBreakdown.find(u => u.ciudad_id === cityInf.ciudad_id);
        if (existing) {
          existing.unassigned_count += result.unassigned;
        } else {
          unassignedBreakdown.push({
            ciudad_id: cityInf.ciudad_id,
            ciudad_nombre: cityInf.ciudad_nombre,
            unassigned_count: result.unassigned,
          });
        }
      }
    }
  }

  const totalUnassigned = unassignedBreakdown.reduce((sum, c) => sum + c.unassigned_count, 0);
  
  // Log results
  if (totalUnassigned > 0) {
    console.warn(
      `⚠️ ${totalUnassigned} events could not be assigned (${((totalUnassigned / calculatedEvents) * 100).toFixed(1)}% of plan). ` +
      `Consider increasing max_events_per_week (current: ${config.max_events_per_week}) or adding more active nodes.`
    );
  } else {
    console.log(`✅ All ${generatedEvents.length} events successfully assigned!`);
  }
  
  return await saveDraftPlan(
    config,
    calculatedEvents,
    generatedEvents,
    totalUnassigned,
    unassignedBreakdown
  );
}
