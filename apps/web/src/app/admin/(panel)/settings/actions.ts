'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { setSetting } from '@/lib/settings';
import { bool, str } from '@/lib/admin/form';

type Spec = { text: string[]; bools?: string[]; urls?: string[]; emails?: string[] };

// Which form fields belong to which setting. Dots make nested objects.
const SPECS: Record<string, Spec> = {
  'public.contact': { text: ['phone', 'whatsapp', 'email', 'address'], emails: ['email'] },
  'public.social': {
    text: ['facebook', 'whatsapp_group', 'whatsapp_channel', 'instagram', 'youtube'],
    urls: ['facebook', 'whatsapp_group', 'whatsapp_channel', 'instagram', 'youtube'],
  },
  'public.payment_accounts': {
    text: ['jazzcash.title', 'jazzcash.number', 'easypaisa.title', 'easypaisa.number', 'nayapay.title', 'nayapay.number', 'bank.bank_name', 'bank.title', 'bank.account', 'bank.iban'],
    bools: ['jazzcash.enabled', 'easypaisa.enabled', 'nayapay.enabled', 'bank.enabled'],
  },
  'public.offer_bar': { text: ['en', 'ur'], bools: ['enabled'] },
  'public.app_links': { text: ['play_store', 'app_store'], urls: ['play_store', 'app_store'] },
};

function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts.slice(0, -1)) {
    cur[p] = (cur[p] as Record<string, unknown>) ?? {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

export async function saveSettings(fd: FormData) {
  const admin = await requireAdmin();
  const key = str(fd, 'key');
  const spec = SPECS[key];
  if (!spec) redirect('/admin/settings?error=Unknown%20setting');

  const value: Record<string, unknown> = {};
  for (const f of spec.text) {
    const v = str(fd, f);
    if (v && spec.urls?.includes(f) && !/^https:\/\//i.test(v)) {
      redirect(`/admin/settings?error=${encodeURIComponent(`${f} must be a full link starting with https://`)}#${key}`);
    }
    if (v && spec.emails?.includes(f) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      redirect(`/admin/settings?error=${encodeURIComponent('Email address is not valid')}#${key}`);
    }
    setPath(value, f, v || null);
  }
  for (const b of spec.bools ?? []) setPath(value, b, bool(fd, b));

  await setSetting(key, value);
  await logActivity(admin.id, 'settings.update', 'site_settings', key);
  revalidatePath('/', 'layout');
  redirect(`/admin/settings?saved=1#${key}`);
}
