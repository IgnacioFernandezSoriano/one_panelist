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

    // Step 1: Activate scheduled leaves that start today
    const { data: leavesToActivate, error: activateQueryError } = await supabase
      .from('scheduled_leaves')
      .select('id, panelista_id, cliente_id')
      .eq('status', 'scheduled')
      .lte('leave_start_date', today)
      .gte('leave_end_date', today);

    if (activateQueryError) {
      console.error('Error querying leaves to activate:', activateQueryError);
    } else {
      console.log(`Found ${leavesToActivate?.length || 0} leaves to activate`);
      
      for (const leave of leavesToActivate || []) {
        try {
          // Mark leave as active
          const { error: updateLeaveError } = await supabase
            .from('scheduled_leaves')
            .update({ status: 'active' })
            .eq('id', leave.id);

          if (updateLeaveError) throw updateLeaveError;

          // Update panelista status
          const { error: updatePanelistaError } = await supabase
            .from('panelistas')
            .update({
              availability_status: 'temporary_leave',
              last_availability_change: new Date().toISOString()
            })
            .eq('id', leave.panelista_id);

          if (updatePanelistaError) throw updatePanelistaError;

          console.log(`Activated leave ${leave.id} for panelista ${leave.panelista_id}`);
        } catch (error) {
          console.error(`Error activating leave ${leave.id}:`, error);
        }
      }
    }

    // Step 2: Complete expired leaves and reactivate panelists
    const { data: expiredLeaves, error: expiredQueryError } = await supabase
      .from('scheduled_leaves')
      .select('id, panelista_id, cliente_id, leave_start_date, leave_end_date, reason')
      .eq('status', 'active')
      .lt('leave_end_date', today);

    if (expiredQueryError) {
      console.error('Error querying expired leaves:', expiredQueryError);
    } else {
      console.log(`Found ${expiredLeaves?.length || 0} expired leaves`);

      for (const leave of expiredLeaves || []) {
        try {
          // Mark leave as completed
          const { error: completeError } = await supabase
            .from('scheduled_leaves')
            .update({ status: 'completed' })
            .eq('id', leave.id);

          if (completeError) throw completeError;

          // Check if panelista has other active leaves
          const { data: activeLeaves, error: activeLeavesError } = await supabase
            .from('scheduled_leaves')
            .select('id')
            .eq('panelista_id', leave.panelista_id)
            .eq('status', 'active')
            .limit(1);

          if (activeLeavesError) throw activeLeavesError;

          // Only reactivate if no other active leaves
          if (!activeLeaves || activeLeaves.length === 0) {
            const { error: reactivateError } = await supabase
              .from('panelistas')
              .update({
                availability_status: 'active',
                last_availability_change: new Date().toISOString()
              })
              .eq('id', leave.panelista_id);

            if (reactivateError) throw reactivateError;

            // Log the reactivation
            const { error: logError } = await supabase
              .from('panelistas_availability_log')
              .insert({
                panelista_id: leave.panelista_id,
                cliente_id: leave.cliente_id,
                status: 'active',
                previous_status: 'temporary_leave',
                leave_start_date: leave.leave_start_date,
                leave_end_date: leave.leave_end_date,
                reason: 'Auto-reactivated after leave expiration',
                changed_at: new Date().toISOString()
              });

            if (logError) throw logError;

            console.log(`Reactivated panelista ${leave.panelista_id} after leave ${leave.id} expired`);
          } else {
            console.log(`Panelista ${leave.panelista_id} still has active leaves, not reactivating`);
          }
        } catch (error) {
          console.error(`Error completing leave ${leave.id}:`, error);
        }
      }
    }

    const reactivatedCount = expiredLeaves?.length || 0;
    const activatedCount = leavesToActivate?.length || 0;
    const errors: any[] = [];

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      reactivated_count: reactivatedCount,
      activated_count: activatedCount,
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