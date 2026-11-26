'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { bool, int, optStr, str } from '@/lib/admin/form';
import { setSetting } from '@/lib/settings';
import { DEFAULT_SEO, getSeo, type SeoSettings } from '@/lib/seo';

function back(error?: string): never {
  revalidatePath('/admin/seo');
  revalidatePath('/', 'layout');
  redirect(error ? `/admin/seo?error=${encodeURIComponent(error)}` : '/admin/seo?saved=1');
}

export async function saveSeo(fd: FormData) {
  const admin = await requireAdmin([]);
  const old = await getSeo();
  const templates = { ...old.templates };
  for (const k of Object.keys(DEFAULT_SEO.templates) as (keyof SeoSettings['templates'])[]) {
    templates[k] = { en: str(fd, `t_${k}_en`) || DEFAULT_SEO.templates[k].en, ur: str(fd, `t_${k}_ur`) || DEFAULT_SEO.templates[k].ur };
  }
  const gsc = optStr(fd, 'gsc_verification');
  const bing = optStr(fd, 'bing_verification');
  const ga = optStr(fd, 'ga4_id')?.toUpperCase() ?? null;
  if (ga && !/^G-[A-Z0-9]{4,16}$/.test(ga)) back('Google Analytics ID looks like G-XXXXXXXXXX.');
  // The GTM code, or the whole pasted snippet: keep only GTM-XXXXXXX
  const gtm = optStr(fd, 'gtm_id')?.toUpperCase().match(/GTM-[A-Z0-9]{4,12}/)?.[0] ?? null;
  if (optStr(fd, 'gtm_id') && !gtm) back('Google Tag Manager ID looks like GTM-XXXXXXX.');
  // People often paste the whole <meta> tag: keep only the code
  const code = (v: string | null) => (v ? (v.match(/content=["']([^"']+)["']/)?.[1] ?? v).trim().slice(0, 100) : null);
  const value: SeoSettings = {
    templates,
    ai_crawlers: str(fd, 'ai_crawlers') === 'block' ? 'block' : 'allow',
    blocked_paths: str(fd, 'blocked_paths').slice(0, 2000),
    llms_extra: str(fd, 'llms_extra').slice(0, 4000),
    gsc_verification: code(gsc),
    bing_verification: code(bing),
    ga4_id: ga,
    gtm_id: gtm,
    index_empty_city_pages: bool(fd, 'index_empty_city_pages'),
  };
  await setSetting('seo', value);
  await logActivity(admin.id, 'seo.update', 'site_settings', 'seo', { ai_crawlers: value.ai_crawlers });
  back();
}

const cleanPath = (p: string) => {
  try {
    const u = new URL(p, 'https://apnaokara.pk');
    return decodeURIComponent(u.pathname).replace(/\/$/, '') || '/';
  } catch {
    return '';
  }
};

export async function addRedirect(fd: FormData) {
  const admin = await requireAdmin([]);
  const from = cleanPath(str(fd, 'from_path'));
  const toRaw = str(fd, 'to_path');
  const to = /^https?:\/\//i.test(toRaw) ? toRaw : cleanPath(toRaw);
  if (!from || from === '/' || !to) back('Write both the old address and the new address (starting with /).');
  if (from === to) back('Old and new address are the same.');
  if (/^\/(api|admin|_next)/.test(from)) back('This address cannot be redirected.');
  const loop = await q1('select 1 from redirects where from_path = $1 and to_path = $2', [to, from]);
  if (loop) back('This would make a loop with another redirect.');
  const code = int(fd, 'status_code') === 302 ? 302 : 301;
  await q(
    `insert into redirects (from_path, to_path, status_code) values ($1, $2, $3)
     on conflict (from_path) do update set to_path = excluded.to_path, status_code = excluded.status_code`,
    [from, to, code],
  );
  await logActivity(admin.id, 'seo.redirect_add', 'redirects', from, { to, code });
  back();
}

export async function deleteRedirect(fd: FormData) {
  const admin = await requireAdmin([]);
  const id = int(fd, 'id');
  await q('delete from redirects where id = $1', [id]);
  await logActivity(admin.id, 'seo.redirect_delete', 'redirects', id);
  back();
}
