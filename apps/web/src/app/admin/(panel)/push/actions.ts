'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { str } from '@/lib/admin/form';
import { setSetting } from '@/lib/settings';
import { broadcast, sendQueued } from '@/lib/push';

export async function sendBroadcast(fd: FormData) {
  const admin = await requireAdmin([]);
  const title = str(fd, 'title').slice(0, 60);
  const body = str(fd, 'body').slice(0, 180);
  const url = str(fd, 'url');
  const locale = str(fd, 'locale') as 'en' | 'ur' | 'all';
  if (title.length < 3 || body.length < 5) redirect('/admin/push?error=Write%20a%20title%20and%20a%20message.');
  if (url && !/^\/[\w\-/?=&%.]*$/.test(url)) redirect('/admin/push?error=Link%20must%20be%20a%20page%20of%20the%20site%2C%20starting%20with%20%2F');
  const n = await broadcast({ title, body, url: url || undefined, locale: ['en', 'ur'].includes(locale) ? locale : 'all' });
  await logActivity(admin.id, 'push.broadcast', 'push_messages', null, { title, devices: n, locale });
  revalidatePath('/admin/push');
  redirect(`/admin/push?saved=1&sent=${n}`);
}

export async function savePushSettings(fd: FormData) {
  const admin = await requireAdmin([]);
  const gap = Math.min(48, Math.max(1, Number(str(fd, 'follow_gap_hours')) || 6));
  const hours = Math.min(168, Math.max(6, Number(str(fd, 'expiring_hours')) || 48));
  await setSetting('public.push', { follow_gap_hours: gap, expiring_hours: hours });
  await logActivity(admin.id, 'push.settings', 'site_settings', 'public.push', { gap, hours });
  redirect('/admin/push?saved=1');
}

export async function retryQueue() {
  await requireAdmin([]);
  await sendQueued();
  redirect('/admin/push?saved=1');
}
