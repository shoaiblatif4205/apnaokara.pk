// Runs once when the website server starts. In local development (no pg_cron)
// it expires old ads every hour. On Supabase, pg_cron does this instead.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}
