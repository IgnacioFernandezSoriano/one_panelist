import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export function useNetworkHealth(
  clienteId: number | null, 
  days: number = 30,
  carrierId: number | null = null,
  productId: number | null = null
) {
  return useQuery({
    queryKey: ['network-health', clienteId, days, carrierId, productId],
    queryFn: async () => {
      if (!clienteId) throw new Error("Cliente ID required");
      
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = subDays(new Date(), days).toISOString().split('T')[0];
      
      const { data, error } = await supabase.rpc('calculate_network_health', {
        p_cliente_id: clienteId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_carrier_id: carrierId,
        p_producto_id: productId
      });
      
      if (error) throw error;
      return data as {
        health_score: number;
        on_time_rate: number;
        valid_rate: number;
        avg_transit_time: number;
        issue_rate: number;
        total_events: number;
      };
    },
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
