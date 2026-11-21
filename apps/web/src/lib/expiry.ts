import { q1 } from '@/lib/db';

// Expire old ads, banners and rishta profiles (calls expire_listings() in the
// database). On Supabase this runs every hour with pg_cron; locally it runs
// from src/instrumentation.ts and whenever the site is used (at most once per 10 minutes).

const g = globalThis as unknown as { lastExpiryRun?: number };
const MIN_GAP_MS = 10 * 60 * 1000;

export async function runExpiryIfDue(): Promise<number | null> {
  const now = Date.now();
  if (g.lastExpiryRun && now - g.lastExpiryRun < MIN_GAP_MS) return null;
  g.lastExpiryRun = now;
  try {
    const row = await q1<{ n: number }>('select expire_listings() as n');
    return row?.n ?? 0;
  } catch (e) {
    console.error('expire_listings failed', e);
    return null;
  }
}
