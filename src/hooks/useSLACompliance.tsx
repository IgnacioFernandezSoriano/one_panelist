import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export function useSLACompliance(clienteId: number | null, days: number = 30) {
  return useQuery({
    queryKey: ['sla-compliance', clienteId, days],
    queryFn: async () => {
      if (!clienteId) throw new Error("Cliente ID required");
      
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = subDays(new Date(), days).toISOString().split('T')[0];
      
      const { data, error } = await supabase.rpc('calculate_sla_compliance', {
        p_cliente_id: clienteId,
        p_start_date: startDate,
        p_end_date: endDate
      });
      
      if (error) throw error;
      return data as {
        on_time_compliance: { actual: number; target: number; status: string };
        valid_rate_compliance: { actual: number; target: number; status: string };
        transit_time_compliance: { actual: number; target: number; status: string };
        issue_rate_compliance: { actual: number; target: number; status: string };
      };
    },
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000,
  });
}
