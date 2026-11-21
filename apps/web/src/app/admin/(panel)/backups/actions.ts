'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { createBackup } from '@/lib/backup';

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
