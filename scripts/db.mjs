// Local PostgreSQL 17 for development (no Docker, no installer).
// Data lives in .local/pgdata (git-ignored). Connection comes from
// DATABASE_URL in apps/web/.env.local.
//
//   npm run db:setup   first time: create database, run shim + migrations + seed
//   npm run db:start   start the database and keep it running (Ctrl+C to stop)
//   npm run db:reset   delete everything and set up again
//   npm run db:query -- "select count(*) from categories"
//   npm run db:migrate runs new files in supabase/migrations (keeps your data)

import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, '.local', 'pgdata');

function readDatabaseUrl() {
  const envPath = join(root, 'apps', 'web', '.env.local');
  if (!existsSync(envPath)) {
    throw new Error('apps/web/.env.local not found. Add DATABASE_URL=postgres://postgres:<password>@localhost:5432/apna_okara');
  }
  const line = readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('DATABASE_URL missing in apps/web/.env.local');
  return new URL(line.slice('DATABASE_URL='.length).trim());
}

const url = readDatabaseUrl();
const dbName = url.pathname.slice(1) || 'apna_okara';
const server = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port || 5432),
  persistent: true,
  // UTF-8 is required for Urdu text (Windows default WIN1252 cannot store it)
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: (m) => {
    if (process.env.DB_DEBUG) console.log('[pg]', String(m).trim());
  },
  onError: (e) => console.error(String(e)),
});

async function runFile(client, file) {
  const sql = readFileSync(file, 'utf8');
  await client.query(sql);
  console.log('  ran', file.replace(root, '.'));
}

async function setup() {
  if (!existsSync(join(dataDir, 'PG_VERSION'))) {
    console.log('Creating local PostgreSQL data folder…');
    await server.initialise();
  }
  await server.start();
  try {
    const admin = new pg.Client({ connectionString: url.toString().replace(`/${dbName}`, '/postgres') });
    await admin.connect();
    const exists = await admin.query('select 1 from pg_database where datname = $1', [dbName]);
    if (exists.rowCount) {
      console.log(`Database "${dbName}" already exists. Use npm run db:reset to start fresh.`);
      await admin.end();
      return;
    }
    await admin.query(`create database "${dbName}" encoding 'UTF8' lc_collate 'C' lc_ctype 'C' template template0`);
    await admin.end();

    const client = new pg.Client({ connectionString: url.toString() });
    client.on('error', () => {});
    await client.connect();
    try {
      await runFile(client, join(root, 'supabase', 'local', '00_supabase_shim.sql'));
      await client.query('create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())');
      const migDir = join(root, 'supabase', 'migrations');
      for (const f of readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()) {
        await runFile(client, join(migDir, f));
        await client.query('insert into public._migrations (name) values ($1)', [f]);
      }
      await runFile(client, join(root, 'supabase', 'seed.sql'));
      console.log(`Database "${dbName}" is ready.`);
    } finally {
      await client.end().catch(() => {});
    }
  } finally {
    await server.stop();
  }
}

async function start() {
  if (!existsSync(join(dataDir, 'PG_VERSION'))) {
    console.log('No local database yet. Run: npm run db:setup');
    process.exit(1);
  }
  await server.start();
  console.log(`PostgreSQL running on localhost:${url.port || 5432} (database "${dbName}"). Press Ctrl+C to stop.`);
  const stop = async () => {
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  setInterval(() => {}, 1 << 30);
}

async function reset() {
  if (existsSync(dataDir)) {
    console.log('Deleting local database…');
    rmSync(dataDir, { recursive: true, force: true });
  }
  await setup();
}

async function query(sql) {
  // Works whether or not the database is already running.
  let started = false;
  let client = new pg.Client({ connectionString: url.toString() });
  client.on('error', () => {});
  try {
    await client.connect();
  } catch {
    await server.start();
    started = true;
    client = new pg.Client({ connectionString: url.toString() });
    client.on('error', () => {});
    await client.connect();
  }
  const res = await client.query(sql);
  const results = Array.isArray(res) ? res : [res];
  for (const r of results) if (r.rows?.length) console.table(r.rows);
  await client.end();
  if (started) await server.stop();
}

/** Apply migration files that have not run yet (keeps existing data). */
async function migrate() {
  let started = false;
  let client = new pg.Client({ connectionString: url.toString() });
  client.on('error', () => {});
  try {
    await client.connect();
  } catch {
    await server.start();
    started = true;
    client = new pg.Client({ connectionString: url.toString() });
    client.on('error', () => {});
    await client.connect();
  }
  try {
    await client.query('create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())');
    const migDir = join(root, 'supabase', 'migrations');
    const files = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
    const done = new Set((await client.query('select name from public._migrations')).rows.map((r) => r.name));
    // Databases created before migration tracking: the first file already ran
    if (!done.size && (await client.query("select to_regclass('public.listings') as t")).rows[0].t) {
      await client.query('insert into public._migrations (name) values ($1)', [files[0]]);
      done.add(files[0]);
    }
    let n = 0;
    for (const f of files) {
      if (done.has(f)) continue;
      await client.query('begin');
      try {
        await runFile(client, join(migDir, f));
        await client.query('insert into public._migrations (name) values ($1)', [f]);
        await client.query('commit');
        n++;
      } catch (e) {
        await client.query('rollback');
        throw new Error(`${f} failed: ${e.message}`);
      }
    }
    console.log(n ? `Applied ${n} migration(s).` : 'Database is up to date.');
  } finally {
    await client.end().catch(() => {});
    if (started) await server.stop();
  }
}

const [cmd, ...rest] = process.argv.slice(2);
const commands = { setup, start, reset, migrate, query: () => query(rest.join(' ')) };
if (!commands[cmd]) {
  console.log('Usage: node scripts/db.mjs <setup|start|reset|query "SQL">');
  process.exit(1);
}
commands[cmd]().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
