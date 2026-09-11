import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key-here';

export const isSupabaseConfigured = 
  supabaseUrl !== 'https://your-supabase-project.supabase.co' && 
  supabaseAnonKey !== 'your-supabase-anon-key-here';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
