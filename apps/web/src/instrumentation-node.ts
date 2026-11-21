import { runJobs } from './lib/jobs';
import { sendQueued } from './lib/push';

// Node.js only (loaded from instrumentation.ts). Local development and
// any always-on server: hourly jobs (expiry, reminders, daily backup) and
// sending queued push messages every minute.
// Not on Vercel: there the daily Vercel Cron calls /api/cron instead.
if (process.env.DATABASE_URL && process.env.DISABLE_JOBS !== '1' && !process.env.VERCEL) {
  const hourly = () => {
    runJobs().then((r) => {
      const busy = Object.entries(r).filter(([, v]) => v && (typeof v !== 'object' || Object.values(v as object).some(Boolean)));
      if (busy.length) console.log('[jobs]', JSON.stringify(Object.fromEntries(busy)));
    });
  };
  setTimeout(hourly, 15_000);
  setInterval(hourly, 60 * 60 * 1000);
  setInterval(() => void sendQueued().catch(() => {}), 60 * 1000);
}
