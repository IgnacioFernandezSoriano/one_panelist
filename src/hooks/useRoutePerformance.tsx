import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export function useRoutePerformance(
  clienteId: number | null, 
  days: number = 30,
  carrierId: number | null = null,
  productId: number | null = null
) {
  return useQuery({
    queryKey: ['route-performance', clienteId, days, carrierId, productId],
    queryFn: async () => {
      if (!clienteId) throw new Error("Cliente ID required");
      
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = subDays(new Date(), days).toISOString().split('T')[0];
      
      const { data, error } = await supabase.rpc('get_route_performance', {
        p_cliente_id: clienteId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_carrier_id: carrierId,
        p_producto_id: productId
      });
      
      if (error) throw error;
      return data as Array<{
        nodo_origen: string;
        nodo_destino: string;
        ciudad_origen: string;
        ciudad_destino: string;
        clasificacion_origen: string;
        clasificacion_destino: string;
        total_events: number;
        on_time_events: number;
        on_time_rate: number;
        avg_transit_time: number;
        route_score: number;
      }>;
    },
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000,
  });
}
