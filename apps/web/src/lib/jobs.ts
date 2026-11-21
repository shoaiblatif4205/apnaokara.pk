import { runExpiryIfDue } from '@/lib/expiry';
import { queueExpiringReminders, sendQueued } from '@/lib/push';
import { backupIfDue } from '@/lib/backup';

// Background jobs. Locally they run from instrumentation-node.ts.
// On the live site a Vercel Cron calls /api/cron (with CRON_SECRET) every hour.

export async function runJobs(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      out[name] = await fn();
    } catch (e) {
      out[name] = `error: ${String(e).slice(0, 200)}`;
      console.error(`[jobs] ${name} failed`, e);
    }
  };
  await step('expired', runExpiryIfDue);
  await step('expiring_push', queueExpiringReminders);
  await step('push', sendQueued);
  await step('backup', backupIfDue);
  return out;
}
