'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { int, str } from '@/lib/admin/form';

export async function setMessageStatus(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = int(fd, 'id');
  const status = str(fd, 'status');
  if (!['new', 'replied', 'closed'].includes(status)) redirect('/admin/messages?error=Unknown%20status');
  await q('update contact_messages set status = $2, handled_by = $3 where id = $1', [id, status, admin.id]);
  await logActivity(admin.id, 'contact.status', 'contact_messages', id, { status });
  revalidatePath('/admin/messages');
  redirect(`/admin/messages?${new URLSearchParams({ status: str(fd, 'back') || 'new', saved: '1' })}`);
}
