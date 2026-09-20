/**
 * Supabase Client Initializer for Velvet & Keepsake
 * Safely accesses client-side environment variables with fallback support.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Read from Vite environment variables or global overrides
const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) 
  || (typeof window !== 'undefined' && window.__SUPABASE_URL) 
  || '';

const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) 
  || (typeof window !== 'undefined' && window.__SUPABASE_KEY) 
  || '';

let supabaseInstance = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('xyzcompany') && !SUPABASE_URL.includes('your-project-id')) {
  try {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  } catch (err) {
    console.warn('Could not initialize Supabase client:', err);
  }
}

export const supabase = supabaseInstance;
export const isSupabaseConfigured = Boolean(supabaseInstance);
export default supabase;
