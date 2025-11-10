import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rpasddacpejcjgyiyrsx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYXNkZGFjcGVqY2pneWl5cnN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTUxNTQzMiwiZXhwIjoyMDQ1MDkxNDMyfQ.qOzOIBWrVZJNxOkOPKZhGTdNMYQKtCkOsUxYnqDPBRg';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function resetPassword() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    'cd318141-656d-405b-bd94-cbd8330119df',
    { password: 'Cambio2025*' }
  );
  
  if (error) {
    console.error('Error resetting password:', error);
  } else {
    console.log('Password reset successfully for:', data.user.email);
  }
}

resetPassword();
