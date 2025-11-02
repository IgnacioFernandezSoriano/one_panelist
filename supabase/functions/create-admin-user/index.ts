import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
interface CreateUserRequest {
  email: string;
  password: string;
  nombre_completo?: string;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function validatePassword(password: string): boolean {
  // At least 12 characters, one uppercase, one number, one special char
  return password.length >= 12 &&
         /[A-Z]/.test(password) &&
         /[0-9]/.test(password) &&
         /[^A-Za-z0-9]/.test(password);
}

function validateInput(data: any): { valid: boolean; error?: string; data?: CreateUserRequest } {
  if (!data.email || !data.password) {
    return { valid: false, error: 'Email and password are required' };
  }

  if (!validateEmail(data.email)) {
    return { valid: false, error: 'Invalid email format or email too long (max 255 characters)' };
  }

  if (!validatePassword(data.password)) {
    return { 
      valid: false, 
      error: 'Password must be at least 12 characters with uppercase, number, and special character' 
    };
  }

  if (data.nombre_completo && data.nombre_completo.length > 100) {
    return { valid: false, error: 'Name too long (max 100 characters)' };
  }

  return {
    valid: true,
    data: {
      email: data.email.trim().toLowerCase(),
      password: data.password,
      nombre_completo: data.nombre_completo?.trim()
    }
  };
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

    // Get and validate request body
    const requestData = await req.json();
    const validation = validateInput(requestData);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { email, password, nombre_completo } = validation.data!;

    // Create admin client for user creation
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

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre_completo: nombre_completo || email
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log audit trail
    await supabaseClient
      .from('admin_audit_log')
      .insert({
        user_id: usuario.id,
        action: 'CREATE_USER',
        resource_type: 'auth_user',
        resource_id: authData.user.id,
        details: { email, created_by: user.email }
      });

    console.log(`User created successfully: ${email} by ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: authData.user.id, email: authData.user.email },
        message: 'User created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
