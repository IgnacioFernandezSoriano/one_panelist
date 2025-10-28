import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Helper: generate a strong temporary password (min 12 chars, includes symbols)
  const generateTempPassword = () => {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
    let pass = 'Tmp-'
    for (let i = 0; i < 12; i++) pass += chars[bytes[i] % chars.length]
    return pass
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Starting user synchronization...')

    // Get all users from the usuarios table
    const { data: usuarios, error: usuariosError } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, password_hash, nombre_completo, estado')
      .eq('estado', 'activo')

    if (usuariosError) {
      console.error('Error fetching usuarios:', usuariosError)
      throw new Error(`Failed to fetch usuarios: ${usuariosError.message}`)
    }

    console.log(`Found ${usuarios?.length || 0} active users in usuarios table`)

    const results = {
      total: usuarios?.length || 0,
      created: 0,
      existing: 0,
      failed: [] as any[],
      errors: [] as any[]
    }

    // Process each user
    for (const usuario of usuarios || []) {
      try {
        // Check if user already exists in auth
        const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingAuthUsers?.users?.find(u => u.email === usuario.email)

        if (existingUser) {
          console.log(`User already exists in auth: ${usuario.email}`)
          results.existing++
          continue
        }

        // Create user in Supabase Auth
        console.log(`Creating auth user for: ${usuario.email}`)
        const tempPassword = generateTempPassword()
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: usuario.email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm the email
          user_metadata: {
            nombre_completo: usuario.nombre_completo || usuario.email
          }
        })

        if (authError) {
          console.error(`Failed to create auth user for ${usuario.email}:`, authError)
          results.failed.push({
            email: usuario.email,
            error: authError.message
          })
          results.errors.push(authError.message)
        } else {
          console.log(`Successfully created auth user for: ${usuario.email}`)
          results.created++
        }
      } catch (error: any) {
        console.error(`Error processing user ${usuario.email}:`, error)
        results.failed.push({
          email: usuario.email,
          error: error?.message || 'Unknown error'
        })
        results.errors.push(error?.message || 'Unknown error')
      }
    }

    console.log('Synchronization completed:', results)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Synchronization completed. Created: ${results.created}, Existing: ${results.existing}, Failed: ${results.failed.length}`,
        details: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || 'Unknown error occurred',
        details: error
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})