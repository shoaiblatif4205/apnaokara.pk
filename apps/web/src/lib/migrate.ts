import { getPool } from '@/lib/db';
import { MIGRATIONS, SEED_SQL } from '@/lib/sql/bundle.generated';

// Applies database setup files that are not applied yet (same tracking table as
// scripts/db.mjs), then the starting data (categories, cities, prices, settings)
// if the database is empty. Safe to run again: finished files are skipped.

export type MigrateResult = { applied: string[]; seeded: boolean; pending: number };

export async function pendingMigrations(): Promise<string[]> {
  const c = await getPool().connect();
  try {
    const t = await c.query(`select to_regclass('public._migrations') as t`);
    if (!t.rows[0].t) return MIGRATIONS.map((m) => m.name);
    const done = new Set((await c.query<{ name: string }>('select name from public._migrations')).rows.map((r) => r.name));
    return MIGRATIONS.filter((m) => !done.has(m.name)).map((m) => m.name);
  } finally {
    c.release();
  }
}

export async function runMigrations(): Promise<MigrateResult> {
  const c = await getPool().connect();
  const applied: string[] = [];
  let seeded = false;
  try {
    await c.query('create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())');
    await c.query('alter table public._migrations enable row level security');
    const done = new Set((await c.query<{ name: string }>('select name from public._migrations')).rows.map((r) => r.name));
    for (const m of MIGRATIONS) {
      if (done.has(m.name)) continue;
      try {
        // Each file runs as one unit: if any statement fails, nothing from that file stays
        await c.query(`begin;\n${m.sql}\n;commit;`);
      } catch (e) {
        await c.query('rollback').catch(() => {});
        throw new Error(`${m.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
      await c.query('insert into public._migrations (name) values ($1) on conflict do nothing', [m.name]);
      applied.push(m.name);
    }
    const empty = await c.query<{ n: number }>('select count(*)::int as n from categories');
    if (empty.rows[0].n === 0) {
      try {
        await c.query(`begin;\n${SEED_SQL}\n;commit;`);
        seeded = true;
      } catch (e) {
        await c.query('rollback').catch(() => {});
        throw new Error(`seed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return { applied, seeded, pending: 0 };
  } finally {
    c.release();
  }
}
