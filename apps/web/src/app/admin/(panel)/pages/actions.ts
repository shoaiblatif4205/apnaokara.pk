'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { optStr, str } from '@/lib/admin/form';
import { DEFAULT_PAGES, PAGE_SLUGS, type PageSlug } from '@/lib/defaultPages';

export async function savePage(fd: FormData) {
  const admin = await requireAdmin(['blog_writer']);
  const slug = str(fd, 'slug') as PageSlug;
  if (!PAGE_SLUGS.includes(slug)) redirect('/admin/pages?error=Unknown%20page');
  const def = DEFAULT_PAGES[slug];
  const status = str(fd, 'status') === 'archived' ? 'archived' : 'published';
  const bodyEn = str(fd, 'body_en');
  const bodyUr = str(fd, 'body_ur');
  // Saving the starting text unchanged keeps it as "starting text" (so later improvements to it still show).
  const keepEn = bodyEn === def.body.en.trim() ? '' : bodyEn;
  const keepUr = bodyUr === def.body.ur.trim() ? '' : bodyUr;
  const values = [
    slug,
    str(fd, 'title_en') || def.title.en,
    str(fd, 'title_ur') || def.title.ur,
    keepEn,
    keepUr,
    optStr(fd, 'seo_title'),
    optStr(fd, 'seo_description'),
    status,
    admin.id,
    slug === 'about' && !keepEn && !keepUr,
  ];
  await q(
    `insert into pages (slug, title_en, title_ur, body_en, body_ur, seo_title, seo_description, status, updated_by, needs_owner_content)
     values ($1, $2, $3, $4, $5, $6, $7, $8::publish_status, $9, $10)
     on conflict (slug) do update set title_en = excluded.title_en, title_ur = excluded.title_ur, body_en = excluded.body_en,
       body_ur = excluded.body_ur, seo_title = excluded.seo_title, seo_description = excluded.seo_description,
       status = excluded.status, updated_by = excluded.updated_by, needs_owner_content = excluded.needs_owner_content`,
    values,
  );
  await logActivity(admin.id, 'page.update', 'pages', slug, { status });
  revalidatePath(`/en/${slug}`);
  revalidatePath(`/ur/${slug}`);
  revalidatePath('/admin/pages');
  redirect(`/admin/pages/${slug}?saved=1`);
}
