import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create a Supabase client with the auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user from usuarios table
    const { data: usuario, error: usuarioError } = await supabaseClient
      .from('usuarios')
      .select('id')
      .eq('email', user.email)
      .single();

    if (usuarioError || !usuario) {
      console.error('Usuario not found:', usuarioError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user has superadmin role
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', usuario.id);

    if (rolesError || !roles || !roles.some(r => r.role === 'superadmin')) {
      console.error('Not superadmin:', { userId: usuario.id, roles });
      return new Response(
        JSON.stringify({ error: 'Forbidden: Superadmin role required' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create admin client for sync operation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get all active users from usuarios table
    const { data: usuarios, error: usuariosError } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, nombre_completo')
      .eq('estado', 'activo');

    if (usuariosError) {
      console.error('Error fetching usuarios:', usuariosError);
      return new Response(
        JSON.stringify({ error: 'Error fetching users from database' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${usuarios?.length || 0} active usuarios to sync`);

    // Get existing auth users
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingEmails = new Set(existingAuthUsers?.users?.map(u => u.email?.toLowerCase()) || []);

    let syncedCount = 0;
    let skippedCount = 0;
    const errors: any[] = [];

    // Sync each user
    for (const usuario of usuarios || []) {
      const email = usuario.email.toLowerCase();

      if (existingEmails.has(email)) {
        console.log(`User already exists in auth: ${email}`);
        skippedCount++;
        continue;
      }

      try {
        const tempPassword = generateTempPassword();
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            nombre_completo: usuario.nombre_completo
          }
        });

        if (authError) {
          console.error(`Error creating auth user for ${email}:`, authError);
          errors.push({ email, error: authError.message });
          continue;
        }

        console.log(`Successfully created auth user: ${email}`);
        syncedCount++;

      } catch (error: any) {
        console.error(`Exception creating auth user for ${email}:`, error);
        errors.push({ email, error: error.message });
      }
    }

    // Log audit trail
    await supabaseClient
      .from('admin_audit_log')
      .insert({
        user_id: usuario.id,
        action: 'SYNC_USERS',
        resource_type: 'auth_users',
        details: { 
          synced: syncedCount, 
          skipped: skippedCount, 
          errors: errors.length,
          executed_by: user.email 
        }
      });

    console.log(`Sync complete: ${syncedCount} created, ${skippedCount} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        success: true,
        synced: syncedCount,
        skipped: skippedCount,
        errors: errors,
        message: `Synchronization complete: ${syncedCount} users created`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
