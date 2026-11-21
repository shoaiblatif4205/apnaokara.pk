import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PoolClient } from 'pg';
import { q } from '@/lib/db';

// File storage (local version): files are saved on disk in .local/uploads
// and recorded in storage.objects. At deployment this file switches to
// Supabase Storage; callers only use saveObject / readObject / publicUrl.

export type Bucket = 'listing-images' | 'banners' | 'blog' | 'payment-screenshots' | 'rishta-photos' | 'backups';
export const PUBLIC_BUCKETS: Bucket[] = ['listing-images', 'banners', 'blog'];

const ROOT = process.env.LOCAL_UPLOAD_DIR || path.resolve(process.cwd(), '..', '..', '.local', 'uploads');

function safePath(bucket: string, key: string): string {
  const base = path.resolve(ROOT, bucket);
  const full = path.resolve(base, key);
  if (!full.startsWith(base + path.sep)) throw new Error('Invalid file path');
  return full;
}

export async function saveObject(
  bucket: Bucket,
  key: string,
  data: Buffer,
  contentType: string,
  client?: PoolClient,
): Promise<void> {
  const full = safePath(bucket, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  const sql = `insert into storage.objects (bucket_id, name, metadata) values ($1, $2, $3)
               on conflict (bucket_id, name) do nothing`;
  const params = [bucket, key, JSON.stringify({ contentType, size: data.length })];
  if (client) await client.query(sql, params);
  else await q(sql, params);
}

export async function readObject(bucket: string, key: string): Promise<Buffer | null> {
  try {
    return await readFile(safePath(bucket, key));
  } catch {
    return null;
  }
}

export function publicUrl(bucket: Bucket, key: string): string {
  return `/api/files/${bucket}/${key}`;
}

export async function deleteObject(bucket: Bucket, key: string): Promise<void> {
  await rm(safePath(bucket, key), { force: true });
  await q('delete from storage.objects where bucket_id = $1 and name = $2', [bucket, key]);
}
