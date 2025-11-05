import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rpasddacpejcjgyfyrsx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYXNkZGFjcGVqY2pneWl5cnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNDUwNDYsImV4cCI6MjA3NzgyMTA0Nn0.JL3omQaWFF60ZxUPx3_lkRfyOWtm50IMWhZtr3AknFk'
);

async function checkSchema() {
  console.log('Checking generated_allocation_plan_details schema...\n');
  
  // Try to get one row to see the actual structure
  const { data, error } = await supabase
    .from('generated_allocation_plan_details')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error querying table:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Available columns:');
    console.log(Object.keys(data[0]).join(', '));
    console.log('\nSample row:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('No data found in table');
  }
}

checkSchema();
