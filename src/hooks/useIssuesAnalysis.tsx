import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export function useIssuesAnalysis(clienteId: number | null, days: number = 30) {
  return useQuery({
    queryKey: ['issues-analysis', clienteId, days],
    queryFn: async () => {
      if (!clienteId) throw new Error("Cliente ID required");
      
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = subDays(new Date(), days).toISOString().split('T')[0];
      
      const { data, error } = await supabase.rpc('analyze_issues', {
        p_cliente_id: clienteId,
        p_start_date: startDate,
        p_end_date: endDate
      });
      
      if (error) throw error;
      return data as {
        summary: {
          open_count: number;
          in_progress_count: number;
          resolved_count: number;
          total_count: number;
        };
        by_type: Array<{ tipo: string; count: number }>;
        affected_routes: Array<{
          nodo_origen: string;
          nodo_destino: string;
          issue_count: number;
        }>;
      };
    },
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000,
  });
}
