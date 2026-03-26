import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function initSupabase(url: string, key: string): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return supabaseClient;
}

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || 'https://hgtmnmyiafflmpthcfkl.supabase.co';
    const key = process.env.SUPABASE_ANON_KEY || '';
    return initSupabase(url, key);
  }
  return supabaseClient;
}

export default { initSupabase, getSupabase };
