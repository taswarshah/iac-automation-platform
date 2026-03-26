import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://hgtmnmyiafflmpthcfkl.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function executeSQL(sql) {
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Executing ${statements.length} SQL statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement || statement.length < 5) continue;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_text: statement });
      if (error) {
        console.log(`Statement ${i + 1} error:`, error.message);
      } else {
        console.log(`Statement ${i + 1} executed successfully`);
      }
    } catch (e) {
      // RPC might not exist, try direct approach
      console.log(`Statement ${i + 1}: Trying alternative method...`);
    }
  }
}

async function checkTables() {
  console.log('\n--- Checking existing tables ---');
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .limit(10);
  
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Existing tables:', data?.length || 0);
    data?.forEach(t => console.log(' -', t.table_name));
  }
}

async function main() {
  console.log('Testing Supabase connection...\n');
  
  try {
    // Try to query something simple
    const { data, error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('Note: Tables may not exist yet -', error.message);
      console.log('\nThe service role key may not have SQL execution privileges.');
      console.log('Please run the SQL manually in Supabase SQL Editor.');
    } else {
      console.log('Connected! Organizations count:', data);
    }
  } catch (e) {
    console.log('Connection test failed:', e.message);
  }
  
  await checkTables();
}

main();
