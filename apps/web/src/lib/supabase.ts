import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public client (anon key). Reads only what Row Level Security allows.
// Returns null until Supabase keys are added to apps/web/.env.local,
// so the site still runs (with empty states) before the database is connected.
export function getPublicSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('YOUR-PROJECT')) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Server-only admin client (service role). Never import this in client components.
export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('YOUR-PROJECT')) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
