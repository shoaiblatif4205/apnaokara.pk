'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { int, str } from '@/lib/admin/form';

export async function handleReport(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = int(fd, 'id');
  const status = str(fd, 'status');
  if (!['actioned', 'dismissed'].includes(status)) redirect('/admin/reports?error=Invalid');
  await q('update reports set status = $2, handled_by = $3 where id = $1', [id, status, admin.id]);
  await logActivity(admin.id, `report.${status}`, 'reports', id);
  revalidatePath('/admin/reports');
  redirect(`/admin/reports?saved=1&tab=${encodeURIComponent(str(fd, 'tab') || 'open')}`);
}
