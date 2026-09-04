import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase browser client (public, anon key).
 * Respects Row Level Security (RLS) policies.
 * Safe to use in client components.
 */
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
