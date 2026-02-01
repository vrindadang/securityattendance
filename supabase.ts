
import { createClient } from '@supabase/supabase-js';

/**
 * Connected to your new Supabase project
 */
const supabaseUrl = 'https://tsxagvipkiyklpxfxkln.supabase.co';
const supabaseAnonKey = 'sb_publishable_a3dFRQ7Ba4G1fD04m2gMxQ_YATiYB9B';

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
