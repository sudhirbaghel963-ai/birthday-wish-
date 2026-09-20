/**
 * Supabase Client Initializer for Velvet & Keepsake
 * Safely accesses client-side environment variables with fallback support.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export function sanitizeSupabaseUrl(raw) {
  let url = (typeof raw === 'string' ? raw : '').trim();
  if (!url || url.includes('your-project-id') || url.includes('xyzcompany')) {
    return 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
  }
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (/^[a-z0-9_-]+$/i.test(url)) {
      return `https://${url}.supabase.co`;
    }
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
}

export function sanitizeSupabaseKey(raw) {
  let key = (typeof raw === 'string' ? raw : '').trim();
  if (!key || key.includes('your-anon-key') || key.includes('your-key')) {
    return 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';
  }
  return key;
}

// Read from Vite environment variables or global overrides
const RAW_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) 
  || (typeof window !== 'undefined' && window.__SUPABASE_URL) 
  || '';

const RAW_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) 
  || (typeof window !== 'undefined' && window.__SUPABASE_KEY) 
  || '';

const SUPABASE_URL = sanitizeSupabaseUrl(RAW_URL);
const SUPABASE_ANON_KEY = sanitizeSupabaseKey(RAW_KEY);

let supabaseInstance = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
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
