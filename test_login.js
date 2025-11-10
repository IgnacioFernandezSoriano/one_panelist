const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rpasddacpejcjgyiyrsx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYXNkZGFjcGVqY2pneWl5cnN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTUxNTQzMiwiZXhwIjoyMDQ1MDkxNDMyfQ.qOzOIBWrVZJNxOkOPKZhGTdNMYQKtCkOsUxYnqDPBRg';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testLogin() {
  // Get user by email
  const { data: users, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error listing users:', error);
    return;
  }
  
  const user = users.users.find(u => u.email === 'ignacio.fernandez@upu.int');
  console.log('User found:', user ? 'YES' : 'NO');
  if (user) {
    console.log('User ID:', user.id);
    console.log('Email confirmed:', user.email_confirmed_at ? 'YES' : 'NO');
    console.log('Last sign in:', user.last_sign_in_at);
  }
}

testLogin();
