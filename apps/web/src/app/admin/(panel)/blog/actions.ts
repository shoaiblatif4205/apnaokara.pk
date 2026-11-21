'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, q1, tx } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { bool, int, optInt, optStr, pkDateTime, str } from '@/lib/admin/form';
import { BadImageError, processPhoto } from '@/lib/images';
import { saveObject } from '@/lib/storage';
import { readingMinutes } from '@/lib/markdown';

const ROLES = ['blog_writer'] as const;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '');
}

function back(path: string, error?: string): never {
  revalidatePath('/admin/blog');
  revalidatePath('/', 'layout');
  redirect(error ? `${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(error)}` : `${path}${path.includes('?') ? '&' : '?'}saved=1`);
}

/** "Question | Answer" per line -> [{q, a}] */
function parseFaq(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.split('|').map((s) => s.trim()))
    .filter(([qq, a]) => qq && a)
    .map(([qq, ...a]) => ({ q: qq, a: a.join(' | ') }));
}

export async function savePost(fd: FormData) {
  const admin = await requireAdmin([...ROLES]);
  const id = optStr(fd, 'id');
  const here = id ? `/admin/blog/${id}` : '/admin/blog/new';
  const title = str(fd, 'title');
  if (title.length < 5) back(here, 'Write a title (at least 5 letters).');
  const locale = str(fd, 'locale') === 'ur' ? 'ur' : 'en';
  let slug = slugify(str(fd, 'slug') || title);
  if (slug.length < 3) slug = `post-${randomUUID().slice(0, 6)}`;
  const clash = await q1<{ id: string }>('select id from blog_posts where slug = $1 and id is distinct from $2', [slug, id]);
  if (clash) back(here, `The address "${slug}" is already used by another post. Change the address.`);

  const body = str(fd, 'body');
  let status = str(fd, 'status');
  if (!['draft', 'published', 'archived'].includes(status)) status = 'draft';
  let publishedAt = pkDateTime(str(fd, 'published_at'));
  if (status === 'published') {
    if (!body) back(here, 'A published post needs text.');
    if (!publishedAt) publishedAt = new Date().toISOString();
    if (new Date(publishedAt) > new Date()) status = 'scheduled';
  }

  // Cover image (optional)
  let cover: string | null | undefined;
  const f = fd.get('cover') as unknown as { size?: number; arrayBuffer?: () => Promise<ArrayBuffer> } | null;
  if (f && typeof f === 'object' && f.size && f.arrayBuffer) {
    try {
      cover = `posts/${slug}-${randomUUID().slice(0, 8)}.webp`;
      await saveObject('blog', cover, await processPhoto(Buffer.from(await f.arrayBuffer()), 1600), 'image/webp');
    } catch (e) {
      if (e instanceof BadImageError) back(here, 'Cover must be an image (JPG, PNG or WebP).');
      throw e;
    }
  } else if (bool(fd, 'remove_cover')) cover = null;

  const translationOf = optStr(fd, 'translation_of');
  const values = {
    slug, locale, title,
    excerpt: optStr(fd, 'excerpt'),
    body,
    category_id: optInt(fd, 'category_id'),
    author_id: optInt(fd, 'author_id'),
    related_category_id: optInt(fd, 'related_category_id'),
    faq: JSON.stringify(parseFaq(str(fd, 'faq'))),
    seo_title: optStr(fd, 'seo_title'),
    seo_description: optStr(fd, 'seo_description'),
    focus_keyword: optStr(fd, 'focus_keyword'),
    noindex: bool(fd, 'noindex'),
    status,
    published_at: publishedAt,
    reading_minutes: readingMinutes(body),
    translation_of: translationOf && translationOf !== id ? translationOf : null,
    updated_by: admin.id,
  };
  const tagNames = [...new Set(str(fd, 'tags').split(',').map((t) => t.trim()).filter(Boolean))].slice(0, 10);

  const postId = await tx(async (c) => {
    const cols = Object.keys(values);
    const vals = Object.values(values);
    let pid = id;
    if (id) {
      const sets = cols.map((k, i) => `${k} = $${i + 2}${k === 'status' ? '::publish_status' : k === 'faq' ? '::jsonb' : ''}`);
      await c.query(`update blog_posts set ${sets.join(', ')}${cover !== undefined ? `, cover_path = $${cols.length + 2}` : ''} where id = $1`, [
        id,
        ...vals,
        ...(cover !== undefined ? [cover] : []),
      ]);
    } else {
      const all = cover ? [...cols, 'cover_path'] : cols;
      const ph = all.map((k, i) => `$${i + 1}${k === 'status' ? '::publish_status' : k === 'faq' ? '::jsonb' : ''}`);
      const r = await c.query<{ id: string }>(`insert into blog_posts (${all.join(', ')}) values (${ph.join(', ')}) returning id`, cover ? [...vals, cover] : vals);
      pid = r.rows[0].id;
    }
    await c.query('delete from blog_post_tags where post_id = $1', [pid]);
    for (const name of tagNames) {
      // Tag addresses keep Urdu letters (e.g. /blog/tag/بائیک); an existing tag with the same name is reused.
      const tslug = name.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/[\s-]+/g, '-').slice(0, 60);
      if (!tslug) continue;
      const t = await c.query<{ id: number }>(
        `insert into blog_tags (slug, name) values ($1, $2) on conflict (slug) do update set slug = excluded.slug returning id`,
        [tslug, name],
      );
      await c.query('insert into blog_post_tags (post_id, tag_id) values ($1, $2) on conflict do nothing', [pid, t.rows[0].id]);
    }
    return pid!;
  });
  await logActivity(admin.id, id ? 'blog.update' : 'blog.create', 'blog_posts', postId, { status, slug });
  back(`/admin/blog/${postId}`);
}

export async function deletePost(fd: FormData) {
  const admin = await requireAdmin([]);
  const id = str(fd, 'id');
  await q('update blog_posts set translation_of = null where translation_of = $1', [id]);
  await q('delete from blog_post_tags where post_id = $1', [id]);
  await q('delete from blog_posts where id = $1', [id]);
  await logActivity(admin.id, 'blog.delete', 'blog_posts', id);
  back('/admin/blog');
}

export async function saveBlogCategory(fd: FormData) {
  const admin = await requireAdmin([...ROLES]);
  const id = optInt(fd, 'id');
  const nameEn = str(fd, 'name_en');
  const nameUr = str(fd, 'name_ur');
  const slug = slugify(str(fd, 'slug') || nameEn);
  if (!nameEn || !nameUr || !slug) back('/admin/blog/settings', 'Write the name in English and Urdu.');
  if (id) {
    await q('update blog_categories set slug = $2, name_en = $3, name_ur = $4, sort_order = $5 where id = $1', [id, slug, nameEn, nameUr, int(fd, 'sort_order')]);
  } else {
    const exists = await q1('select 1 from blog_categories where slug = $1', [slug]);
    if (exists) back('/admin/blog/settings', 'A category with this address already exists.');
    await q('insert into blog_categories (slug, name_en, name_ur, sort_order) values ($1, $2, $3, $4)', [slug, nameEn, nameUr, int(fd, 'sort_order', 100)]);
  }
  await logActivity(admin.id, 'blog.category_save', 'blog_categories', id ?? slug);
  back('/admin/blog/settings');
}

export async function deleteBlogCategory(fd: FormData) {
  const admin = await requireAdmin([]);
  const id = int(fd, 'id');
  const used = await q1<{ n: number }>('select count(*)::int as n from blog_posts where category_id = $1', [id]);
  if (used?.n) back('/admin/blog/settings', `This category has ${used.n} post(s). Move them first.`);
  await q('delete from blog_categories where id = $1', [id]);
  await logActivity(admin.id, 'blog.category_delete', 'blog_categories', id);
  back('/admin/blog/settings');
}

export async function saveAuthor(fd: FormData) {
  const admin = await requireAdmin([...ROLES]);
  const id = optInt(fd, 'id');
  const name = str(fd, 'name');
  if (!name) back('/admin/blog/settings', 'Write the author name.');
  if (id) await q('update authors set name = $2, bio = $3 where id = $1', [id, name, optStr(fd, 'bio')]);
  else await q('insert into authors (name, bio) values ($1, $2)', [name, optStr(fd, 'bio')]);
  await logActivity(admin.id, 'blog.author_save', 'authors', id ?? name);
  back('/admin/blog/settings');
}
