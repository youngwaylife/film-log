import { createClient } from '@supabase/supabase-js';

// These environment variables need to be set in your .env file
// VITE_SUPABASE_URL="your-supabase-project-url"
// VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your .env file.');
}

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
