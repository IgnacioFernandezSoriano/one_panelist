import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
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
