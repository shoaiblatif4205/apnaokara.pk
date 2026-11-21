import { q } from '@/lib/db';
import { LIVE } from '@/lib/public';
import { LIVE_POST } from '@/lib/blog';
import { PAGE_SLUGS } from '@/lib/defaultPages';
import { getSeo, SITE_URL } from '@/lib/seo';

// Split XML sitemaps. Only public, live pages; Rishta profiles, member pages,
// search results and expired / sold ads are never listed.

export const LISTINGS_PER_FILE = 10000;

type Entry = { path: string; lastmod?: Date | string | null; locales?: ('en' | 'ur')[]; image?: string | null; alt?: { locale: 'en' | 'ur'; path: string } };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const url = (locale: string, path: string) => esc(encodeURI(`${SITE_URL}/${locale}${path === '/' ? '' : path}`));
const day = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);

export function urlset(entries: Entry[]): string {
  const out: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ];
  for (const e of entries) {
    const locales = e.locales ?? ['ur', 'en'];
    for (const loc of locales) {
      out.push('<url>', `<loc>${url(loc, e.path)}</loc>`);
      const lm = day(e.lastmod);
      if (lm) out.push(`<lastmod>${lm}</lastmod>`);
      if (locales.length > 1) {
        for (const l of locales) out.push(`<xhtml:link rel="alternate" hreflang="${l}" href="${url(l, e.path)}"/>`);
        out.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${url('en', e.path)}"/>`);
      } else if (e.alt) {
        out.push(`<xhtml:link rel="alternate" hreflang="${loc}" href="${url(loc, e.path)}"/>`);
        out.push(`<xhtml:link rel="alternate" hreflang="${e.alt.locale}" href="${url(e.alt.locale, e.alt.path)}"/>`);
      }
      if (e.image) out.push(`<image:image><image:loc>${esc(`${SITE_URL}${e.image}`)}</image:loc></image:image>`);
      out.push('</url>');
    }
  }
  out.push('</urlset>');
  return out.join('\n');
}

export async function sitemapIndex(): Promise<string> {
  const [{ n }] = await q<{ n: number }>(`select count(*)::int as n from listings l where ${LIVE}`);
  const files = ['pages', 'categories', 'blog', ...Array.from({ length: Math.max(1, Math.ceil(n / LISTINGS_PER_FILE)) }, (_, i) => `listings-${i + 1}`)];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...files.map((f) => `<sitemap><loc>${SITE_URL}/sitemaps/${f}.xml</loc></sitemap>`),
    '</sitemapindex>',
  ].join('\n');
}

export async function pagesSitemap(): Promise<string> {
  const rows = await q<{ slug: string; status: string; updated_at: Date }>('select slug, status::text, updated_at from pages');
  const hidden = new Set(rows.filter((r) => r.status === 'archived').map((r) => r.slug));
  const updated = (s: string) => rows.find((r) => r.slug === s)?.updated_at;
  const entries: Entry[] = [
    { path: '/', lastmod: new Date() },
    { path: '/categories' },
    { path: '/advertise' },
    { path: '/rishta' },
    { path: '/blog', lastmod: new Date() },
    ...PAGE_SLUGS.filter((s) => !hidden.has(s)).map((s) => ({ path: `/${s}`, lastmod: updated(s) })),
  ];
  return urlset(entries);
}

export async function categoriesSitemap(): Promise<string> {
  const seo = await getSeo();
  const [cats, cities, combos] = await Promise.all([
    q<{ id: number; slug: string; parent_slug: string | null; last: Date | null }>(
      `select c.id, c.slug, p.slug as parent_slug,
              (select max(l.approved_at) from listings l where (l.category_id = c.id or l.subcategory_id = c.id) and ${LIVE}) as last
         from categories c left join categories p on p.id = c.parent_id
        where c.is_active and (p.id is null or p.is_active)`,
    ),
    q<{ id: number; slug: string; last: Date | null }>(
      `select ci.id, ci.slug, (select max(l.approved_at) from listings l where l.city_id = ci.id and ${LIVE}) as last from cities ci where ci.is_active`,
    ),
    // Category x city and sub-category x city pages that have live ads (empty ones are thin pages)
    q<{ cat: string; sub: string | null; city: string; last: Date }>(
      `select c.slug as cat, s.slug as sub, ci.slug as city, max(l.approved_at) as last
         from listings l join categories c on c.id = l.category_id left join categories s on s.id = l.subcategory_id
         join cities ci on ci.id = l.city_id
        where ${LIVE} and c.is_active and ci.is_active
        group by grouping sets ((c.slug, ci.slug), (c.slug, s.slug, ci.slug))`,
    ),
  ]);
  const pub = (slug: string) => slug.split('--').pop()!;
  const entries: Entry[] = [];
  for (const c of cats) entries.push({ path: c.parent_slug ? `/${c.parent_slug}/${pub(c.slug)}` : `/${c.slug}`, lastmod: c.last });
  for (const ci of cities) if (ci.last || seo.index_empty_city_pages) entries.push({ path: `/city/${ci.slug}`, lastmod: ci.last });
  for (const x of combos) entries.push({ path: x.sub ? `/${x.cat}/${pub(x.sub)}/${x.city}` : `/${x.cat}/${x.city}`, lastmod: x.last });
  // Ads without a sub-category also give (category, city) rows: remove duplicates
  const seen = new Set<string>();
  return urlset(entries.filter((e) => (seen.has(e.path) ? false : (seen.add(e.path), true))));
}

export async function listingsSitemap(page: number): Promise<string> {
  const rows = await q<{ slug: string; reference: string; updated_at: Date; cover: string | null }>(
    `select l.slug, l.reference, greatest(l.updated_at, l.approved_at) as updated_at,
            (select storage_path from listing_images i where i.listing_id = l.id and i.deleted_at is null order by i.is_cover desc, i.sort_order limit 1) as cover
       from listings l where ${LIVE} order by l.approved_at desc, l.id limit ${LISTINGS_PER_FILE} offset ${(page - 1) * LISTINGS_PER_FILE}`,
  );
  return urlset(
    rows.map((r) => ({ path: `/ad/${r.slug}-${r.reference}`, lastmod: r.updated_at, image: r.cover ? `/api/files/listing-images/${r.cover}` : null })),
  );
}

export async function blogSitemap(): Promise<string> {
  const [posts, cats] = await Promise.all([
    q<{ slug: string; locale: 'en' | 'ur'; updated_at: Date; cover_path: string | null; t_slug: string | null; t_locale: 'en' | 'ur' | null }>(
      `select p.slug, p.locale, p.updated_at, p.cover_path, t.slug as t_slug, t.locale as t_locale
         from blog_posts p
         left join lateral (select x.slug, x.locale from blog_posts x
                             where x.id <> p.id and (x.id = p.translation_of or x.translation_of = p.id)
                               and x.status in ('published', 'scheduled') and x.published_at <= now() limit 1) t on true
        where ${LIVE_POST} and not p.noindex`,
    ),
    q<{ slug: string; locale: 'en' | 'ur'; last: Date }>(
      `select c.slug, p.locale, max(p.published_at) as last from blog_categories c join blog_posts p on p.category_id = c.id
        where ${LIVE_POST} group by c.slug, p.locale`,
    ),
  ]);
  const entries: Entry[] = posts.map((p) => ({
    path: `/blog/${p.slug}`,
    locales: [p.locale],
    lastmod: p.updated_at,
    image: p.cover_path ? `/api/files/blog/${p.cover_path}` : null,
    alt: p.t_slug && p.t_locale ? { locale: p.t_locale, path: `/blog/${p.t_slug}` } : undefined,
  }));
  for (const c of cats) entries.push({ path: `/blog/category/${c.slug}`, locales: [c.locale], lastmod: c.last });
  return urlset(entries);
}
