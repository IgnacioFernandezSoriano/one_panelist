import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export interface TransitDistributionData {
  ciudadDestino: string;
  clasificacion: string;
  totalEvents: number;
  standardDays: number;
  distribution: Map<number, {
    count: number;
    cumulativePercentage: number;
  }>;
}

export interface TransitTimeDistributionResult {
  routes: TransitDistributionData[];
  minDay: number;
  maxDay: number;
}

export function useTransitTimeDistribution(
  clienteId: number | null,
  ciudadOrigen: string | null,
  days: number = 30,
  carrierId: number | null = null,
  productId: number | null = null
) {
  return useQuery({
    queryKey: ['transit-time-distribution', clienteId, ciudadOrigen, days, carrierId, productId],
    queryFn: async (): Promise<TransitTimeDistributionResult> => {
      if (!clienteId || !ciudadOrigen) {
        return { routes: [], minDay: 1, maxDay: 10 };
      }
      
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = subDays(new Date(), Math.max(days, 365)).toISOString().split('T')[0];
      
      const { data, error } = await supabase.rpc('get_transit_time_distribution', {
        p_cliente_id: clienteId,
        p_ciudad_origen: ciudadOrigen,
        p_start_date: startDate,
        p_end_date: endDate,
        p_carrier_id: carrierId,
        p_producto_id: productId
      });
      
      if (error) throw error;
      
      // Process data into matrix structure
      const routesMap = new Map<string, TransitDistributionData>();
      let minDay = Infinity;
      let maxDay = -Infinity;
      
      if (data && data.length > 0) {
        data.forEach((row: any) => {
          const key = row.ciudad_destino;
          
          if (!routesMap.has(key)) {
            routesMap.set(key, {
              ciudadDestino: row.ciudad_destino,
              clasificacion: row.clasificacion_destino,
              totalEvents: row.total_events_route,
              standardDays: row.standard_days,
              distribution: new Map()
            });
          }
          
          const route = routesMap.get(key)!;
          route.distribution.set(row.transit_days, {
            count: row.event_count,
            cumulativePercentage: row.cumulative_percentage
          });
          
          minDay = Math.min(minDay, row.transit_days);
          maxDay = Math.max(maxDay, row.transit_days);
        });
      }
      
      // Default values if no data
      if (minDay === Infinity) minDay = 1;
      if (maxDay === -Infinity) maxDay = 10;
      
      return {
        routes: Array.from(routesMap.values()).sort((a, b) => 
          a.ciudadDestino.localeCompare(b.ciudadDestino)
        ),
        minDay,
        maxDay
      };
    },
    enabled: !!clienteId && !!ciudadOrigen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
