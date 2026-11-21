import { gzipSync } from 'node:zlib';
import { q, q1 } from '@/lib/db';
import { deleteObject, saveObject } from '@/lib/storage';

// Database backup without pg_dump: every table (public, auth.users, storage
// objects) is written as JSON lines and gzipped into the private "backups"
// bucket. Restore with: node scripts/restore-backup.mjs <file.jsonl.gz>
// Uploaded photos are not inside; they stay in file storage.

export const KEEP_BACKUPS = 14;
const CHUNK = 2000;

async function tables(): Promise<string[]> {
  const rows = await q<{ name: string }>(
    `select format('%I.%I', table_schema, table_name) as name from information_schema.tables
      where table_type = 'BASE TABLE' and (table_schema = 'public' or (table_schema = 'auth' and table_name = 'users')
            or (table_schema = 'storage' and table_name in ('buckets', 'objects')))
      order by table_schema <> 'auth', table_schema <> 'storage', table_name`,
  );
  return rows.map((r) => r.name);
}

export async function createBackup(startedBy: string | null): Promise<{ file: string; size: number; rows: number }> {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
  const file = `apna-okara-${stamp}.jsonl.gz`;
  try {
    const lines: string[] = [];
    const migrations = await q<{ name: string }>('select name from public._migrations order by name').catch(() => []);
    lines.push(JSON.stringify({ type: 'header', app: 'apna-okara', created_at: now.toISOString(), migrations: migrations.map((m) => m.name) }));
    let total = 0;
    for (const t of await tables()) {
      if (t === 'public.backups') continue;
      for (let offset = 0; ; offset += CHUNK) {
        const rows = await q<{ r: unknown }>(`select to_jsonb(x) as r from ${t} x order by 1 limit ${CHUNK} offset ${offset}`);
        if (!rows.length) {
          if (offset === 0) lines.push(JSON.stringify({ type: 'table', table: t, rows: [] }));
          break;
        }
        lines.push(JSON.stringify({ type: 'table', table: t, rows: rows.map((x) => x.r) }));
        total += rows.length;
        if (rows.length < CHUNK) break;
      }
    }
    const data = gzipSync(Buffer.from(lines.join('\n'), 'utf8'), { level: 9 });
    await saveObject('backups', file, data, 'application/gzip');
    await q('insert into backups (file_name, size_bytes, started_by) values ($1, $2, $3)', [file, data.length, startedBy]);
    await pruneBackups();
    return { file, size: data.length, rows: total };
  } catch (e) {
    await q(`insert into backups (file_name, status, error, started_by) values ($1, 'failed', $2, $3)`, [file, String(e).slice(0, 500), startedBy]);
    throw e;
  }
}

async function pruneBackups() {
  const old = await q<{ id: number; file_name: string }>(
    `select id, file_name from backups where status = 'done' order by created_at desc offset ${KEEP_BACKUPS}`,
  );
  for (const b of old) {
    await deleteObject('backups', b.file_name).catch(() => {});
    await q('delete from backups where id = $1', [b.id]);
  }
}

/** Once a day (first run after 02:00 Pakistan time when no backup exists for today). */
export async function backupIfDue(): Promise<string | null> {
  const pkHour = (new Date().getUTCHours() + 5) % 24;
  if (pkHour < 2) return null;
  const today = await q1(
    `select 1 from backups where status = 'done' and (created_at at time zone 'Asia/Karachi')::date = (now() at time zone 'Asia/Karachi')::date and started_by is null`,
  );
  if (today) return null;
  return (await createBackup(null)).file;
}
