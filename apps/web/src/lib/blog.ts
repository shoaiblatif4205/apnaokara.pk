import { cache } from 'react';
import { q, q1 } from '@/lib/db';
import { publicUrl } from '@/lib/storage';

// Public blog. A post is live when it is published (or scheduled) and its
// publish date has passed. Each post is written in one language (en or ur);
// a translation can be linked with translation_of.

export const LIVE_POST = `p.status in ('published', 'scheduled') and p.published_at <= now()`;

export type PostCard = {
  id: string;
  slug: string;
  locale: 'en' | 'ur';
  title: string;
  excerpt: string | null;
  cover: string | null;
  publishedAt: string;
  readingMinutes: number;
  category: { slug: string; name_en: string; name_ur: string } | null;
};

type CardRow = {
  id: string; slug: string; locale: 'en' | 'ur'; title: string; excerpt: string | null; cover_path: string | null;
  published_at: Date; reading_minutes: number | null; cat_slug: string | null; cat_en: string | null; cat_ur: string | null;
};

const CARD_SELECT = `select p.id, p.slug, p.locale, p.title, p.excerpt, p.cover_path, p.published_at, p.reading_minutes,
  c.slug as cat_slug, c.name_en as cat_en, c.name_ur as cat_ur
  from blog_posts p left join blog_categories c on c.id = p.category_id`;

function toCard(r: CardRow): PostCard {
  return {
    id: r.id,
    slug: r.slug,
    locale: r.locale,
    title: r.title,
    excerpt: r.excerpt,
    cover: r.cover_path ? publicUrl('blog', r.cover_path) : null,
    publishedAt: r.published_at.toISOString(),
    readingMinutes: r.reading_minutes ?? 1,
    category: r.cat_slug ? { slug: r.cat_slug, name_en: r.cat_en!, name_ur: r.cat_ur! } : null,
  };
}

export const getBlogCategories = cache(async (locale: 'en' | 'ur') =>
  q<{ slug: string; name_en: string; name_ur: string; posts: number }>(
    `select c.slug, c.name_en, c.name_ur, count(p.id)::int as posts
       from blog_categories c left join blog_posts p on p.category_id = c.id and p.locale = $1 and ${LIVE_POST}
      group by c.id order by c.sort_order, c.id`,
    [locale],
  ),
);

export async function listPosts(opts: { locale: 'en' | 'ur'; category?: string; tag?: string; page?: number; perPage?: number }) {
  const perPage = opts.perPage ?? 9;
  const page = Math.max(1, opts.page ?? 1);
  const where = [LIVE_POST, 'p.locale = $1'];
  const args: unknown[] = [opts.locale];
  if (opts.category) {
    args.push(opts.category);
    where.push(`c.slug = $${args.length}`);
  }
  if (opts.tag) {
    args.push(opts.tag);
    where.push(`exists (select 1 from blog_post_tags pt join blog_tags t on t.id = pt.tag_id where pt.post_id = p.id and t.slug = $${args.length})`);
  }
  const w = where.join(' and ');
  const [rows, count] = await Promise.all([
    q<CardRow>(`${CARD_SELECT} where ${w} order by p.published_at desc limit ${perPage} offset ${(page - 1) * perPage}`, args),
    q1<{ n: number }>(`select count(*)::int as n from blog_posts p left join blog_categories c on c.id = p.category_id where ${w}`, args),
  ]);
  const total = count?.n ?? 0;
  return { posts: rows.map(toCard), total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function latestPosts(locale: 'en' | 'ur', limit = 3): Promise<PostCard[]> {
  const rows = await q<CardRow>(`${CARD_SELECT} where ${LIVE_POST} and p.locale = $1 order by p.published_at desc limit ${limit}`, [locale]);
  return rows.map(toCard);
}

export type PostDetail = PostCard & {
  body: string;
  faq: { q: string; a: string }[];
  seoTitle: string | null;
  seoDescription: string | null;
  focusKeyword: string | null;
  noindex: boolean;
  updatedAt: string;
  author: { name: string; bio: string | null } | null;
  tags: { slug: string; name: string }[];
  translation: { slug: string; locale: 'en' | 'ur' } | null;
  relatedCategorySlug: string | null;
  relatedSubSlug: string | null;
  categoryId: number | null;
};

export const getPost = cache(async (slug: string): Promise<PostDetail | null> => {
  const r = await q1<
    CardRow & {
      body: string; faq: { q: string; a: string }[]; seo_title: string | null; seo_description: string | null; focus_keyword: string | null;
      noindex: boolean; updated_at: Date; author_name: string | null; author_bio: string | null; translation_of: string | null;
      related_cat_slug: string | null; related_sub_slug: string | null; category_id: number | null;
    }
  >(
    `select p.id, p.slug, p.locale, p.title, p.excerpt, p.cover_path, p.published_at, p.reading_minutes,
            c.slug as cat_slug, c.name_en as cat_en, c.name_ur as cat_ur,
            p.body, p.faq, p.seo_title, p.seo_description, p.focus_keyword, p.noindex, p.updated_at,
            a.name as author_name, a.bio as author_bio, p.translation_of, coalesce(rcp.slug, rc.slug) as related_cat_slug, case when rcp.id is not null then rc.slug end as related_sub_slug, p.category_id
       from blog_posts p left join blog_categories c on c.id = p.category_id left join authors a on a.id = p.author_id left join categories rc on rc.id = p.related_category_id left join categories rcp on rcp.id = rc.parent_id
      where p.slug = $1 and ${LIVE_POST}`,
    [slug],
  );
  if (!r) return null;
  const [tags, tr] = await Promise.all([
    q<{ slug: string; name: string }>(
      'select t.slug, t.name from blog_post_tags pt join blog_tags t on t.id = pt.tag_id where pt.post_id = $1 order by t.name',
      [r.id],
    ),
    q1<{ slug: string; locale: 'en' | 'ur' }>(
      `select p.slug, p.locale from blog_posts p where ${LIVE_POST} and p.id <> $1 and (p.id = $2 or p.translation_of = $1) limit 1`,
      [r.id, r.translation_of],
    ),
  ]);
  return {
    ...toCard(r),
    body: r.body,
    faq: Array.isArray(r.faq) ? r.faq.filter((f) => f?.q && f?.a) : [],
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    focusKeyword: r.focus_keyword,
    noindex: r.noindex,
    updatedAt: r.updated_at.toISOString(),
    author: r.author_name ? { name: r.author_name, bio: r.author_bio } : null,
    tags,
    translation: tr,
    relatedCategorySlug: r.related_cat_slug,
    relatedSubSlug: r.related_sub_slug,
    categoryId: r.category_id,
  };
});

export async function relatedPosts(post: PostDetail, limit = 3): Promise<PostCard[]> {
  const rows = await q<CardRow>(
    `${CARD_SELECT} where ${LIVE_POST} and p.locale = $1 and p.id <> $2
      order by (p.category_id is not distinct from $3) desc, p.published_at desc limit ${limit}`,
    [post.locale, post.id, post.categoryId],
  );
  return rows.map(toCard);
}

export async function getTag(slug: string) {
  return q1<{ slug: string; name: string }>('select slug, name from blog_tags where slug = $1', [slug]);
}

export function countPostView(id: string): void {
  q('update blog_posts set views = views + 1 where id = $1', [id]).catch(() => {});
}
