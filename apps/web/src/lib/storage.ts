import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PoolClient } from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { q } from '@/lib/db';

// File storage. Two backends, same functions:
//  - Live (Vercel): Supabase Storage, when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
//    Vercel's disk is temporary, so files must never be kept there.
//  - Local development: files on disk in .local/uploads (recorded in storage.objects).
// Callers only use saveObject / readObject / deleteObject / publicUrl.

export type Bucket = 'listing-images' | 'banners' | 'blog' | 'payment-screenshots' | 'rishta-photos' | 'backups';
export const PUBLIC_BUCKETS: Bucket[] = ['listing-images', 'banners', 'blog'];

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const useSupabase = !!SUPABASE_URL && !!SUPABASE_KEY && !SUPABASE_URL.includes('YOUR-PROJECT');

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

const ROOT = process.env.LOCAL_UPLOAD_DIR || path.resolve(process.cwd(), '..', '..', '.local', 'uploads');

function safeKey(key: string): string {
  if (!/^[\w./-]+$/.test(key) || key.includes('..') || key.startsWith('/')) throw new Error('Invalid file path');
  return key;
}

function safePath(bucket: string, key: string): string {
  const base = path.resolve(ROOT, bucket);
  const full = path.resolve(base, key);
  if (!full.startsWith(base + path.sep)) throw new Error('Invalid file path');
  return full;
}

export async function saveObject(bucket: Bucket, key: string, data: Buffer, contentType: string, client?: PoolClient): Promise<void> {
  if (useSupabase) {
    const { error } = await sb()
      .storage.from(bucket)
      .upload(safeKey(key), data, { contentType, upsert: true, cacheControl: PUBLIC_BUCKETS.includes(bucket) ? '31536000' : '0' });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return;
  }
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
    if (useSupabase) {
      const { data, error } = await sb().storage.from(bucket).download(safeKey(key));
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    }
    return await readFile(safePath(bucket, key));
  } catch {
    return null;
  }
}

/** Address used in pages: always our own /api/files route (it checks access for private buckets). */
export function publicUrl(bucket: Bucket, key: string): string {
  return `/api/files/${bucket}/${key}`;
}

/** Direct public address on Supabase (public buckets only), or null when files are local. */
export function directPublicUrl(bucket: Bucket, key: string): string | null {
  if (!useSupabase || !PUBLIC_BUCKETS.includes(bucket)) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export async function deleteObject(bucket: Bucket, key: string): Promise<void> {
  if (useSupabase) {
    await sb().storage.from(bucket).remove([safeKey(key)]);
    return;
  }
  await rm(safePath(bucket, key), { force: true });
  await q('delete from storage.objects where bucket_id = $1 and name = $2', [bucket, key]);
}
