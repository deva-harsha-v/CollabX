import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://ufgcoodlgjrljwtdqdba.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZ2Nvb2RsZ2pybGp3dGRxZGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMjMwMjYsImV4cCI6MjEwNDY5OTAyNn0.hUtpae0U8ciRImBijAaY1Mh5SSH2beDOeIy8EqOZzEw';

export const isSupabaseConfigured = 
  Boolean(supabaseUrl) && 
  Boolean(supabaseAnonKey) && 
  supabaseUrl !== 'https://your-supabase-project.supabase.co';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
