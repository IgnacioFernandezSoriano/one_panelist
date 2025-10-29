import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format, getMonth, addMonths, startOfMonth, endOfMonth, startOfDay, addDays, getYear } from "date-fns";

export interface PlanConfig {
  cliente_id: number;
  carrier_id: number;
  producto_id: number;
  start_date: Date;
  end_date: Date;
  total_events: number;
  max_events_per_week: number;
  merge_strategy: 'append' | 'replace';
  created_by: number;
}

export interface GeneratedEvent {
  nodo_origen: string;
  nodo_destino: string;
  fecha_programada: string;
  ciudad_origen_id: number;
  ciudad_destino_id: number;
}

export interface UnassignedCity {
  ciudad_id: number;
  ciudad_nombre: string;
  deficit: number;
}

interface CityRequirement {
  ciudad_id: number;
  ciudad_nombre: string;
  from_classification_a: number;
  from_classification_b: number;
  from_classification_c: number;
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

async function loadCityRequirements(cliente_id: number): Promise<CityRequirement[]> {
  const { data, error } = await supabase
    .from('city_allocation_requirements')
    .select(`
      ciudad_id,
      from_classification_a,
      from_classification_b,
      from_classification_c,
      ciudades (
        nombre,
        clasificacion
      )
    `)
    .eq('cliente_id', cliente_id);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    ciudad_id: row.ciudad_id,
    ciudad_nombre: row.ciudades?.nombre || 'Unknown',
    from_classification_a: row.from_classification_a || 0,
    from_classification_b: row.from_classification_b || 0,
    from_classification_c: row.from_classification_c || 0,
    clasificacion: row.ciudades?.clasificacion || 'C'
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
      ciudades (
        id,
        region_id,
        clasificacion
      )
    `)
    .eq('cliente_id', cliente_id);

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
    result[monthKey] = Math.round((totalEvents * percentage) / totalWeight);
  });

  return result;
}

function distributeByCities(
  monthlyEvents: number,
  cityRequirements: CityRequirement[]
): Record<number, number> {
  const result: Record<number, number> = {};
  
  const totalWeight = cityRequirements.reduce((sum, city) => {
    return sum + city.from_classification_a + city.from_classification_b + city.from_classification_c;
  }, 0);

  if (totalWeight === 0) return result;

  cityRequirements.forEach(city => {
    const cityWeight = city.from_classification_a + city.from_classification_b + city.from_classification_c;
    result[city.ciudad_id] = Math.round((monthlyEvents * cityWeight) / totalWeight);
  });

  return result;
}

function getRandomDateInMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  const daysInMonth = differenceInDays(end, start) + 1;
  const randomDay = Math.floor(Math.random() * daysInMonth);
  return format(addDays(start, randomDay), 'yyyy-MM-dd');
}

function selectRandomDestination(topology: Node[], excludeNode: string): { codigo: string; ciudad_id: number } {
  const availableNodes = topology.filter(n => 
    n.codigo !== excludeNode && 
    n.estado === 'activo'
  );
  
  if (availableNodes.length === 0) {
    return { codigo: excludeNode, ciudad_id: 0 };
  }
  
  const randomIndex = Math.floor(Math.random() * availableNodes.length);
  const selected = availableNodes[randomIndex];
  return { codigo: selected.codigo, ciudad_id: selected.ciudad_id };
}

function balanceByClassification(
  cityEvents: number,
  cityNodes: Node[],
  classification: 'A' | 'B' | 'C',
  allTopology: Node[],
  maxEventsPerWeek: number,
  monthKey: string
): { assigned: GeneratedEvent[], unassigned: number } {
  const assigned: GeneratedEvent[] = [];
  let remaining = cityEvents;

  let nodesToBalance: Node[] = [];
  
  if (classification === 'A' || classification === 'B') {
    nodesToBalance = cityNodes.filter(n => n.estado === 'activo');
  } else if (classification === 'C') {
    const regionId = cityNodes[0]?.region_id;
    const currentCityId = cityNodes[0]?.ciudad_id;
    
    nodesToBalance = allTopology.filter(n => 
      n.region_id === regionId &&
      n.clasificacion === 'C' &&
      n.estado === 'activo' &&
      n.ciudad_id !== currentCityId
    );
  }

  if (nodesToBalance.length === 0) {
    return { assigned: [], unassigned: cityEvents };
  }

  const weeksInMonth = 4;
  const maxPerNode = maxEventsPerWeek * weeksInMonth;
  const nodeCounts: Record<string, number> = {};

  let nodeIndex = 0;
  let attempts = 0;
  const maxAttempts = remaining * nodesToBalance.length * 2;

  while (remaining > 0 && attempts < maxAttempts) {
    const node = nodesToBalance[nodeIndex % nodesToBalance.length];
    const currentCount = nodeCounts[node.codigo] || 0;

    if (currentCount < maxPerNode) {
      const randomDate = getRandomDateInMonth(monthKey);
      const destination = selectRandomDestination(allTopology, node.codigo);
      
      assigned.push({
        nodo_origen: node.codigo,
        nodo_destino: destination.codigo,
        fecha_programada: randomDate,
        ciudad_origen_id: node.ciudad_id,
        ciudad_destino_id: destination.ciudad_id,
      });

      nodeCounts[node.codigo] = currentCount + 1;
      remaining--;
    }

    nodeIndex++;
    attempts++;

    if (nodeIndex >= nodesToBalance.length && Object.values(nodeCounts).every(count => count >= maxPerNode)) {
      break;
    }
  }

  return { assigned, unassigned: remaining };
}

async function saveDraftPlan(
  config: PlanConfig,
  calculatedEvents: number,
  events: GeneratedEvent[],
  unassignedEvents: number,
  unassignedBreakdown: UnassignedCity[]
) {
  const { data: plan, error: planError } = await supabase
    .from('generated_allocation_plans' as any)
    .insert({
      cliente_id: config.cliente_id,
      carrier_id: config.carrier_id,
      producto_id: config.producto_id,
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
        algorithm_version: '1.0',
        timestamp: new Date().toISOString()
      }
    })
    .select()
    .single();

  if (planError) throw planError;

  const planId = (plan as any).id;
  const details = events.map(event => ({
    plan_id: planId,
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
  const carrierProductExists = await validateCarrierProduct(config.carrier_id, config.producto_id);
  if (!carrierProductExists) {
    throw new Error("Carrier not assigned to this product");
  }

  const cityRequirements = await loadCityRequirements(config.cliente_id);
  if (cityRequirements.length === 0) {
    throw new Error("No city allocation requirements configured");
  }

  // Log capacity warning if max_events_per_week is too low
  if (config.max_events_per_week < 3) {
    console.warn(
      `⚠️ Low capacity detected: ${config.max_events_per_week} events/week = ${config.max_events_per_week * 4} events/month/node. ` +
      `This may result in many unassigned events. Recommended minimum: 3 events/week.`
    );
  }

  const seasonality = await loadProductSeasonality(
    config.cliente_id,
    config.producto_id,
    getYear(config.start_date)
  );

  const topology = await loadTopology(config.cliente_id);
  if (topology.length === 0) {
    throw new Error("No active nodes configured");
  }

  // Calculate theoretical capacity
  const totalWeeks = Math.ceil(differenceInDays(config.end_date, config.start_date) / 7);
  const theoreticalCapacity = topology.length * config.max_events_per_week * totalWeeks;
  console.log(
    `📊 Plan capacity: ${topology.length} nodes × ${config.max_events_per_week} events/week × ${totalWeeks} weeks = ` +
    `${theoreticalCapacity} max events (requested: ${config.total_events})`
  );

  const totalDays = differenceInDays(config.end_date, config.start_date) + 1;
  const proportionalEvents = Math.round((config.total_events * totalDays) / 365);

  const eventsByMonth = distributeByMonth(proportionalEvents, seasonality, config.start_date, config.end_date);

  const allEvents: GeneratedEvent[] = [];
  const unassignedBreakdown: UnassignedCity[] = [];

  for (const [monthKey, monthlyEvents] of Object.entries(eventsByMonth)) {
    const eventsByCity = distributeByCities(monthlyEvents, cityRequirements);

    for (const [ciudadIdStr, cityEvents] of Object.entries(eventsByCity)) {
      const ciudadId = parseInt(ciudadIdStr);
      const cityTopology = topology.filter(n => n.ciudad_id === ciudadId);
      const ciudadInfo = cityRequirements.find(c => c.ciudad_id === ciudadId);

      if (!ciudadInfo || cityTopology.length === 0) continue;

      const balancedEvents = balanceByClassification(
        cityEvents,
        cityTopology,
        ciudadInfo.clasificacion,
        topology,
        config.max_events_per_week,
        monthKey
      );

      allEvents.push(...balancedEvents.assigned);
      
      if (balancedEvents.unassigned > 0) {
        const existingCity = unassignedBreakdown.find(c => c.ciudad_id === ciudadId);
        if (existingCity) {
          existingCity.deficit += balancedEvents.unassigned;
        } else {
          unassignedBreakdown.push({
            ciudad_id: ciudadId,
            ciudad_nombre: ciudadInfo.ciudad_nombre,
            deficit: balancedEvents.unassigned
          });
        }
      }
    }
  }

  const totalUnassigned = unassignedBreakdown.reduce((sum, c) => sum + c.deficit, 0);
  
  // Log results
  if (totalUnassigned > 0) {
    console.warn(
      `⚠️ ${totalUnassigned} events could not be assigned (${((totalUnassigned / proportionalEvents) * 100).toFixed(1)}% of plan). ` +
      `Consider increasing max_events_per_panelist_week (current: ${config.max_events_per_week}) or adding more active nodes.`
    );
  } else {
    console.log(`✅ All ${allEvents.length} events successfully assigned!`);
  }
  
  return await saveDraftPlan(
    config,
    proportionalEvents,
    allEvents,
    totalUnassigned,
    unassignedBreakdown
  );
}
