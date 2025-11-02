import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function validatePassword(password: string): boolean {
  // At least 12 characters, one uppercase, one number, one special char
  return password.length >= 12 &&
         /[A-Z]/.test(password) &&
         /[0-9]/.test(password) &&
         /[^A-Za-z0-9]/.test(password);
}

// Add random delay to prevent timing attacks
async function randomDelay() {
  const delay = Math.floor(Math.random() * 200) + 100; // 100-300ms
  await new Promise(resolve => setTimeout(resolve, delay));
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
      await randomDelay();
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
      await randomDelay();
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
      await randomDelay();
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
      await randomDelay();
      return new Response(
        JSON.stringify({ error: 'Forbidden: Superadmin role required' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      await randomDelay();
      return new Response(
        JSON.stringify({ error: 'Email and newPassword are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate password strength
    if (!validatePassword(newPassword)) {
      await randomDelay();
      return new Response(
        JSON.stringify({ 
          error: 'Password must be at least 12 characters with uppercase, number, and special character' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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

    console.log(`Attempting to reset password for user (initiated by: ${user.email})`);

    // Get the user by email
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingAuthUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // Always add delay to prevent user enumeration via timing
    await randomDelay();

    if (!existingUser) {
      // Don't reveal if user exists or not
      console.log(`Password reset attempted for non-existent user`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'If the user exists, the password has been reset successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      // Don't reveal detailed error to prevent information leakage
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'If the user exists, the password has been reset successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log audit trail (only on success)
    await supabaseClient
      .from('admin_audit_log')
      .insert({
        user_id: usuario.id,
        action: 'RESET_PASSWORD',
        resource_type: 'auth_user',
        resource_id: existingUser.id,
        details: { target_user_id: existingUser.id, executed_by: user.email }
      });

    console.log(`Password reset successful (executed by: ${user.email})`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password has been reset successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Fatal error:', error);
    await randomDelay();
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'An error occurred processing your request'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
