import { createClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    ENV?: {
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
    };
  }
}

/**
 * Use runtime environment variables injected by Google AI Studio / Vercel
 */
const supabaseUrl =
  window.ENV?.SUPABASE_URL || 'https://tsxagvipkiyklpxfxkln.supabase.co';

const supabaseAnonKey =
  window.ENV?.SUPABASE_ANON_KEY || 'sb_publishable_a3dFRQ7Ba4G1fD04m2gMxQ_YATiYB9B';

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});