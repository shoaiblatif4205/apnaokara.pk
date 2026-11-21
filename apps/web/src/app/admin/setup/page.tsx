import { redirect } from 'next/navigation';
import { q1 } from '@/lib/db';
import { pendingMigrations } from '@/lib/migrate';
import { createFirstAdmin, prepareDatabase } from './actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const metadata = { title: 'First admin', robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  key: 'The setup code is not correct.',
  email: 'Enter a valid email address.',
  password: 'Password must be at least 12 characters, and both boxes must match.',
  disabled: 'Setup is turned off. Add ADMIN_SETUP_KEY in Vercel settings first.',
};

// Shown only until the first Super Admin exists. After that it always goes to the login page.
export default async function SetupPage(props: { searchParams: Promise<{ error?: string; db?: string }> }) {
  const searchParams = await props.searchParams;
  let adminExists = false;
  try {
    adminExists = !!(await q1('select 1 from admin_users limit 1'));
  } catch {
    /* tables not created yet */
  }
  if (adminExists) redirect('/admin/login');
  let pending: string[] = [];
  let dbError: string | null = null;
  try {
    pending = await pendingMigrations();
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }
  const db = searchParams.db ?? '';
  const input = 'mt-1 block min-h-[44px] w-full rounded-lg border border-line bg-white px-3 py-2 text-base';
  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-4">
      <div className="w-full max-w-md space-y-4">
      {searchParams.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{ERRORS[searchParams.error] ?? 'Something went wrong.'}</p>}
      {dbError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Cannot reach the database: {dbError}. Check DATABASE_URL in Vercel.</p>}
      {db.startsWith('fail:') && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Database setup stopped: {db.slice(5)}</p>}
      {db.startsWith('ok:') && <p role="status" className="rounded-lg bg-brand-light p-3 text-sm text-brand-dark">Database ready ({db.split(':')[1]} setup files{db.split(':')[2] === '1' ? ' + starting data' : ''}).</p>}
      {pending.length > 0 && !dbError && (
        <form action={prepareDatabase} className="card space-y-4 p-6">
          <h1 className="text-xl font-bold">Step 1: Prepare the database</h1>
          <p className="text-sm text-ink-muted">Creates all tables, categories, cities, prices and settings ({pending.length} setup files). Takes up to a minute.</p>
          <label className="block text-sm font-semibold">Setup code (from Vercel settings)<input name="setup_key" required autoComplete="off" className={input} /></label>
          <button type="submit" className="btn-primary w-full">Prepare database</button>
        </form>
      )}
      {pending.length === 0 && !dbError && (
      <form action={createFirstAdmin} className="card w-full max-w-md space-y-4 p-6">
        <h1 className="text-xl font-bold">Step 2: Create the first admin</h1>
        <p className="text-sm text-ink-muted">One time only. Use a strong password that you do not use anywhere else.</p>
        <label className="block text-sm font-semibold">Setup code (from Vercel settings)<input name="setup_key" required autoComplete="off" className={input} /></label>
        <label className="block text-sm font-semibold">Your name<input name="full_name" required className={input} /></label>
        <label className="block text-sm font-semibold">Email<input name="email" type="email" required autoComplete="username" className={input} /></label>
        <label className="block text-sm font-semibold">Password (12+ characters)<input name="password" type="password" minLength={12} required autoComplete="new-password" className={input} /></label>
        <label className="block text-sm font-semibold">Password again<input name="password2" type="password" minLength={12} required autoComplete="new-password" className={input} /></label>
        <button type="submit" className="btn-primary w-full">Create admin</button>
      </form>
      )}
      </div>
    </main>
  );
}
