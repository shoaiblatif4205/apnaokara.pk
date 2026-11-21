import { Pool, type PoolClient } from 'pg';

// Server-only database access (PostgreSQL).
// Local: embedded PostgreSQL (npm run db:start). Production: Supabase's
// Postgres connection string in DATABASE_URL. Same SQL works on both.

const globalForPg = globalThis as unknown as { pgPool?: Pool };

function createPool(): Pool {
  // sslmode in the link would override the ssl option below, so it is removed (encryption is still on)
  const connectionString = process.env.DATABASE_URL?.replace(/([?&])sslmode=[^&]*(&|$)/, (_m, p: string, s: string) => (s ? p : '')).replace(/\?$/, '');
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add it to apps/web/.env.local and run npm run db:start.');
  }
  // Supabase requires an encrypted connection; Vercel runs many small copies, so keep few connections each
  const remote = !/@(localhost|127.0.0.1)[:/]/.test(connectionString);
  return new Pool({
    connectionString,
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
