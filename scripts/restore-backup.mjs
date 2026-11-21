// Restore a backup made in Admin -> Backups (apna-okara-YYYYMMDD-HHMM.jsonl.gz).
//
//   node scripts/restore-backup.mjs path/to/apna-okara-....jsonl.gz --yes
//
// WARNING: this REPLACES all data in the database given by DATABASE_URL
// (default: apps/web/.env.local, or set DATABASE_URL yourself for Supabase).
// The database must already have the same tables (run migrations first).
// Uploaded photos are not in the backup; copy .local/uploads (or the
// Supabase Storage buckets) separately.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error('Usage: node scripts/restore-backup.mjs <backup.jsonl.gz> --yes');
  process.exit(1);
}
if (!process.argv.includes('--yes')) {
  console.error('This replaces ALL data in the database. Add --yes to continue.');
  process.exit(1);
}

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  const env = readFileSync(join(root, 'apps', 'web', '.env.local'), 'utf8');
  dbUrl = env.split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length).trim();
}
if (!dbUrl) throw new Error('DATABASE_URL not found');

const lines = gunzipSync(readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const header = lines.shift();
if (header?.type !== 'header' || header.app !== 'apna-okara') throw new Error('Not an Apna Okara backup file');
console.log(`Backup from ${header.created_at} (${header.migrations?.length ?? 0} migrations)`);

const byTable = new Map();
for (const l of lines) {
  if (l.type !== 'table') continue;
  if (!byTable.has(l.table)) byTable.set(l.table, []);
  byTable.get(l.table).push(...l.rows);
}

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();
try {
  await client.query('begin');
  // Skip foreign-key checks and triggers while loading (needs a superuser / postgres role)
  await client.query(`set local session_replication_role = replica`);
  const names = [...byTable.keys()].filter((t) => t !== 'public._migrations');
  await client.query(`truncate ${names.join(', ')} cascade`);
  let total = 0;
  for (const t of names) {
    const rows = byTable.get(t);
    for (let i = 0; i < rows.length; i += 1000) {
      const part = rows.slice(i, i + 1000);
      await client.query(`insert into ${t} overriding system value select * from jsonb_populate_recordset(null::${t}, $1::jsonb)`, [JSON.stringify(part)]);
    }
    total += rows.length;
    if (rows.length) console.log(`  ${t}: ${rows.length}`);
  }
  // Move every sequence / identity past the highest restored value
  const seqs = await client.query(`
    select format('%I.%I', s.schemaname, s.sequencename) as seq, c.relname as tbl, n.nspname as sch, a.attname as col
      from pg_sequences s
      join pg_class sc on sc.relname = s.sequencename
      join pg_namespace sn on sn.oid = sc.relnamespace and sn.nspname = s.schemaname
      join pg_depend d on d.objid = sc.oid and d.deptype in ('a', 'i')
      join pg_class c on c.oid = d.refobjid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attnum = d.refobjsubid`);
  for (const s of seqs.rows) {
    await client.query(`select setval('${s.seq}', greatest(coalesce((select max("${s.col}") from "${s.sch}"."${s.tbl}"), 0), 1))`);
  }
  // Reference numbers (AO-10001, R-1001) use their own sequences
  await client.query(`select setval('listing_ref_seq', greatest(coalesce((select max(substring(reference from 4)::bigint) from listings), 10000), 10000))`).catch(() => {});
  await client.query(`select setval('rishta_ref_seq', greatest(coalesce((select max(substring(reference from 3)::bigint) from rishta_profiles), 1000), 1000))`).catch(() => {});
  await client.query('commit');
  console.log(`Restored ${total} rows into ${names.length} tables.`);
} catch (e) {
  await client.query('rollback').catch(() => {});
  console.error('Restore failed, nothing was changed:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
