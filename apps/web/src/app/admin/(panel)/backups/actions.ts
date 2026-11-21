'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { createBackup } from '@/lib/backup';
import { runMigrations } from '@/lib/migrate';

export async function backupNow() {
  const admin = await requireAdmin([]);
  let msg: string;
  try {
    const b = await createBackup(admin.id);
    await logActivity(admin.id, 'backup.create', 'backups', b.file, { rows: b.rows, size: b.size });
    msg = `Backup made: ${b.rows.toLocaleString('en-PK')} rows, ${(b.size / 1024).toFixed(0)} KB.`;
  } catch (e) {
    redirect(`/admin/backups?error=${encodeURIComponent(`Backup failed: ${String(e).slice(0, 150)}`)}`);
  }
  revalidatePath('/admin/backups');
  redirect(`/admin/backups?saved=${encodeURIComponent(msg)}`);
}

/** Apply new database setup files that came with a website update. */
export async function runDatabaseUpdates() {
  const admin = await requireAdmin([]);
  let to: string;
  try {
    const r = await runMigrations();
    await logActivity(admin.id, 'database.update', 'migrations', null, { applied: r.applied });
    to = `/admin/backups?saved=${encodeURIComponent(r.applied.length ? `Database updated: ${r.applied.join(', ')}` : 'Database is already up to date.')}`;
  } catch (e) {
    to = `/admin/backups?error=${encodeURIComponent(`Database update failed: ${String(e instanceof Error ? e.message : e).slice(0, 200)}`)}`;
  }
  redirect(to);
}
