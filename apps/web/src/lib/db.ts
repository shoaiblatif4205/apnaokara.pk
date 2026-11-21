import { Pool, type PoolClient } from 'pg';

// Server-only database access (PostgreSQL).
// Local: embedded PostgreSQL (npm run db:start). Production: Supabase's
// Postgres connection string in DATABASE_URL. Same SQL works on both.

const globalForPg = globalThis as unknown as { pgPool?: Pool };

type DbConfig = { host: string; port: number; user: string; password: string; database: string };

/**
 * Reads DATABASE_URL by hand, so a pasted value still works when it has the name
 * "DATABASE_URL=" in front, quotes, spaces, [brackets] or special characters
 * (@ # / % ?) in the password. Returns what was fixed (never the password itself).
 */
export function parseDatabaseUrl(raw: string | undefined): { config: DbConfig | null; notes: string[] } {
  const notes: string[] = [];
  if (!raw || !raw.trim()) return { config: null, notes: ['DATABASE_URL is empty'] };
  let s = raw.trim();
  if (/^DATABASE_URL\s*=/i.test(s)) {
    s = s.replace(/^DATABASE_URL\s*=\s*/i, '');
    notes.push('the name DATABASE_URL= was inside the value (fixed)');
  }
  if (/^["'][\s\S]*["']$/.test(s)) {
    s = s.slice(1, -1).trim();
    notes.push('the value had quotes (fixed)');
  }
  if (/\s/.test(s)) {
    s = s.replace(/\s+/g, '');
    notes.push('the value had spaces or line breaks (fixed)');
  }
  // user : password (anything, up to the LAST @) @ host [:port] / database [?options]
  const m = s.match(/^postgres(?:ql)?:\/\/([^:/?#@]+):([\s\S]*)@([^@/?#:]+)(?::(\d+))?\/([^?#]*)(?:[?#][\s\S]*)?$/);
  if (!m) {
    notes.push(/^https?:\/\//.test(s) ? 'this is a website address, not the database link (it must start with postgresql://)' : 'the value is not a postgresql:// link');
    return { config: null, notes };
  }
  let password = m[2];
  if (/^\[[\s\S]*\]$/.test(password)) {
    password = password.slice(1, -1);
    notes.push('the password still had [ ] brackets around it (fixed)');
  }
  if (/%[0-9A-Fa-f]{2}/.test(password)) {
    try {
      password = decodeURIComponent(password);
    } catch {
      /* keep as typed */
    }
  }
  if (/YOUR-DATABASE-PASSWORD|APNA-PASSWORD|PUT-YOUR/i.test(password)) notes.push('the password part was not replaced with the real password');
  const port = Number(m[4] || 5432);
  if (m[3].includes('pooler.supabase.com') && port !== 6543) notes.push(`port ${port}: the Transaction pooler uses 6543`);
  return { config: { host: m[3], port, user: decodeURIComponent(m[1]), password, database: m[5] || 'postgres' }, notes };
}

function createPool(): Pool {
  const { config, notes } = parseDatabaseUrl(process.env.DATABASE_URL);
  if (!config) {
    throw new Error(`DATABASE_URL problem: ${notes.join('; ') || 'not set'}. Local: add it to apps/web/.env.local and run npm run db:start.`);
  }
  if (notes.length) console.warn('[db] DATABASE_URL:', notes.join('; '));
  // Supabase requires an encrypted connection; Vercel runs many small copies, so keep few connections each
  const remote = !/^(localhost|127\.0\.0\.1|::1)$/.test(config.host);
  return new Pool({
    ...config,
    max: process.env.VERCEL ? 3 : 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: remote ? { rejectUnauthorized: false } : undefined,
  });
}

export function getPool(): Pool {
  if (!globalForPg.pgPool) globalForPg.pgPool = createPool();
  return globalForPg.pgPool;
}

/** Run a query and return the rows. Always use $1, $2 parameters for values. */
export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

/** First row or null. */
export async function q1<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

/** Run several queries in one transaction. */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
