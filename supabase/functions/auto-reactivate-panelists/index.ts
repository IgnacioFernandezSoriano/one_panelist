import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting auto-reactivate panelists job...');

    const today = new Date().toISOString().split('T')[0];

    // Find panelists with expired leaves
    const { data: expiredLeaves, error: queryError } = await supabase
      .from('panelistas')
      .select('id, nombre_completo, cliente_id, availability_status, current_leave_start, current_leave_end')
      .eq('availability_status', 'temporary_leave')
      .lt('current_leave_end', today);

    if (queryError) {
      console.error('Error querying panelists:', queryError);
      throw queryError;
    }

    console.log(`Found ${expiredLeaves?.length || 0} panelists with expired leaves`);

    let reactivatedCount = 0;
    const errors: any[] = [];

    // Reactivate each panelist
    for (const panelista of expiredLeaves || []) {
      try {
        // Update panelista status
        const { error: updateError } = await supabase
          .from('panelistas')
          .update({
            availability_status: 'active',
            current_leave_start: null,
            current_leave_end: null,
            last_availability_change: new Date().toISOString()
          })
          .eq('id', panelista.id);

        if (updateError) throw updateError;

        // Log the change
        const { error: logError } = await supabase
          .from('panelistas_availability_log')
          .insert({
            panelista_id: panelista.id,
            cliente_id: panelista.cliente_id,
            status: 'active',
            previous_status: 'temporary_leave',
            leave_start_date: panelista.current_leave_start,
            leave_end_date: panelista.current_leave_end,
            reason: 'Auto-reactivated after leave expiration',
            changed_at: new Date().toISOString()
          });

        if (logError) throw logError;

        console.log(`Reactivated panelist ${panelista.id} - ${panelista.nombre_completo}`);
        reactivatedCount++;
      } catch (error) {
        console.error(`Error reactivating panelist ${panelista.id}:`, error);
        errors.push({ 
          panelista_id: panelista.id, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      reactivated_count: reactivatedCount,
      total_found: expiredLeaves?.length || 0,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('Auto-reactivate job completed:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Auto-reactivate job failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});