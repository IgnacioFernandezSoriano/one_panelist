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

    console.log('Starting scheduled panelist changes processing job...');

    const appliedChanges: any[] = [];
    const revertedChanges: any[] = [];
    const errors: any[] = [];

    // Step 1: Apply scheduled changes that should start today
    console.log('Step 1: Applying scheduled changes...');
    const { data: applyResults, error: applyError } = await supabase
      .rpc('apply_scheduled_panelist_changes');

    if (applyError) {
      console.error('Error applying scheduled changes:', applyError);
      errors.push({ step: 'apply', error: applyError.message });
    } else {
      console.log(`Applied changes:`, applyResults);
      appliedChanges.push(...(applyResults || []));
      
      // Log each applied change
      for (const change of applyResults || []) {
        if (change.success) {
          console.log(`✓ Applied change ${change.change_id}: ${change.panelista_current_name} → ${change.panelista_new_name} on node ${change.nodo_codigo}`);
        } else {
          console.error(`✗ Failed to apply change ${change.change_id}: ${change.error_message}`);
          errors.push({
            step: 'apply',
            change_id: change.change_id,
            error: change.error_message
          });
        }
      }
    }

    // Step 2: Revert scheduled changes that should end today
    console.log('Step 2: Reverting expired changes...');
    const { data: revertResults, error: revertError } = await supabase
      .rpc('revert_scheduled_panelist_changes');

    if (revertError) {
      console.error('Error reverting scheduled changes:', revertError);
      errors.push({ step: 'revert', error: revertError.message });
    } else {
      console.log(`Reverted changes:`, revertResults);
      revertedChanges.push(...(revertResults || []));
      
      // Log each reverted change
      for (const change of revertResults || []) {
        if (change.success) {
          console.log(`✓ Reverted change ${change.change_id}: ${change.panelista_new_name} → ${change.panelista_current_name} on node ${change.nodo_codigo}`);
        } else {
          console.error(`✗ Failed to revert change ${change.change_id}: ${change.error_message}`);
          errors.push({
            step: 'revert',
            change_id: change.change_id,
            error: change.error_message
          });
        }
      }
    }

    const result = {
      success: errors.length === 0,
      timestamp: new Date().toISOString(),
      applied_count: appliedChanges.filter(c => c.success).length,
      reverted_count: revertedChanges.filter(c => c.success).length,
      applied_changes: appliedChanges,
      reverted_changes: revertedChanges,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('Scheduled panelist changes processing completed:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Scheduled panelist changes processing failed:', error);
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
