import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rpasddacpejcjgyiyrsx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYXNkZGFjcGVqY2pneWl5cnN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTUxNTQzMiwiZXhwIjoyMDQ1MDkxNDMyfQ.qOzOIBWrVZJNxOkOPKZhGTdNMYQKtCkOsUxYnqDPBRg';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTranslations() {
  const { data, error, count } = await supabase
    .from('traducciones')
    .select('*', { count: 'exact', head: false })
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total translations in DB:', count);
    console.log('Sample translations:', JSON.stringify(data, null, 2));
  }
}

checkTranslations();
