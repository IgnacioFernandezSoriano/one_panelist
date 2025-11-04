import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePerformanceTrends(
  clienteId: number | null, 
  daysBack: number = 90,
  granularity: 'day' | 'week' | 'month' = 'day',
  carrierId: number | null = null,
  productId: number | null = null
) {
  return useQuery({
    queryKey: ['performance-trends', clienteId, daysBack, granularity, carrierId, productId],
    queryFn: async () => {
      if (!clienteId) throw new Error("Cliente ID required");
      
      const { data, error } = await supabase.rpc('get_performance_trends', {
        p_cliente_id: clienteId,
        p_days_back: daysBack,
        p_granularity: granularity,
        p_carrier_id: carrierId,
        p_producto_id: productId
      });
      
      if (error) throw error;
      return data as Array<{
        period_date: string;
        total_events: number;
        on_time_rate: number;
        avg_transit_time: number;
        issue_count: number;
      }>;
    },
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000,
  });
}
