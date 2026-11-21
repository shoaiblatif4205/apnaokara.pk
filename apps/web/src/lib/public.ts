import { cache } from 'react';
import { q, q1 } from '@/lib/db';
import type { MetaField } from '@/lib/meta';

// Read-only data for the public website and app. Only live ads are returned.

export const LIVE = `l.status = 'approved' and (l.expires_at is null or l.expires_at > now())`;
const FEATURED = `(l.is_featured and (l.featured_until is null or l.featured_until > now()))`;

export type Cat = {
  id: number;
  slug: string;
  model: string;
  name_en: string;
  name_ur: string;
  icon: string | null;
  show_on_home: boolean;
  seo_title: string | null;
  seo_description: string | null;
  subs: { id: number; slug: string; name_en: string; name_ur: string }[];
  fields: MetaField[];
  live: number;
};

export type CityRow = { id: number; slug: string; district: string; name_en: string; name_ur: string; live: number };

/** Categories with sub-categories (public slug = part after "--"), fields and live ad counts. */
export const getCategories = cache(async (): Promise<Cat[]> => {
  const [cats, subs, fields] = await Promise.all([
    q<Omit<Cat, 'subs' | 'fields'>>(
      `select c.id, c.slug, c.model::text, c.name_en, c.name_ur, c.icon, c.show_on_home, c.seo_title, c.seo_description,
              (select count(*)::int from listings l where l.category_id = c.id and ${LIVE}) as live
         from categories c where c.parent_id is null and c.is_active order by c.sort_order, c.id`,
    ),
    q<{ id: number; parent_id: number; slug: string; name_en: string; name_ur: string }>(
      `select id, parent_id, slug, name_en, name_ur from categories where parent_id is not null and is_active order by sort_order, id`,
    ),
    q<MetaField & { category_id: number }>(
      `select category_id, key, label_en, label_ur, type, options, unit_en, unit_ur, is_required from category_fields order by sort_order, id`,
    ),
  ]);
  return cats.map((c) => ({
    ...c,
    subs: subs
      .filter((s) => s.parent_id === c.id)
      .map((s) => ({ id: s.id, slug: s.slug.split('--').pop()!, name_en: s.name_en, name_ur: s.name_ur })),
    fields: fields.filter((f) => f.category_id === c.id),
  }));
});

export const getCities = cache(async (): Promise<CityRow[]> =>
  q<CityRow>(
    `select ci.id, ci.slug, d.slug as district, ci.name_en, ci.name_ur,
            (select count(*)::int from listings l where l.city_id = ci.id and ${LIVE}) as live
       from cities ci join districts d on d.id = ci.district_id
      where ci.is_active order by ci.sort_order, ci.id`,
  ),
);

export const getLocalities = cache(async (cityId: number) =>
  q<{ id: number; slug: string; name_en: string; name_ur: string }>(
    'select id, slug, name_en, name_ur from localities where city_id = $1 and is_active order by sort_order, id',
    [cityId],
  ),
);

export type AdCard = {
  id: string;
  reference: string;
  slug: string;
  model: string;
  title: string;
  price: number | null;
  priceType: string;
  city: { en: string; ur: string };
  locality: { en: string; ur: string } | null;
  category: { en: string; ur: string; slug: string };
  cover: string | null;
  featured: boolean;
  verified: boolean;
  rating: number;
  ratingCount: number;
  approvedAt: string;
  fields: Record<string, string | number | boolean>;
};

const CARD_SELECT = `
  select l.id, l.reference, l.slug, l.model::text as model, l.title, l.price, l.price_type, l.custom_fields,
         ci.name_en as city_en, ci.name_ur as city_ur, lo.name_en as loc_en, lo.name_ur as loc_ur,
         c.name_en as cat_en, c.name_ur as cat_ur, c.slug as cat_slug,
         ${FEATURED} as featured, l.is_verified, l.rating_avg, l.rating_count, l.approved_at,
         (select storage_path from listing_images i where i.listing_id = l.id and i.deleted_at is null
           order by i.is_cover desc, i.sort_order limit 1) as cover
    from listings l
    join categories c on c.id = l.category_id
    join cities ci on ci.id = l.city_id
    left join localities lo on lo.id = l.locality_id`;

type CardRow = {
  id: string; reference: string; slug: string; model: string; title: string; price: number | null; price_type: string;
  custom_fields: Record<string, string | number | boolean>; city_en: string; city_ur: string; loc_en: string | null; loc_ur: string | null;
  cat_en: string; cat_ur: string; cat_slug: string; featured: boolean; is_verified: boolean; rating_avg: string; rating_count: number;
  approved_at: string; cover: string | null;
};

function toCard(r: CardRow): AdCard {
  return {
    id: r.id,
    reference: r.reference,
    slug: r.slug,
    model: r.model,
    title: r.title,
    price: r.price,
    priceType: r.price_type,
    city: { en: r.city_en, ur: r.city_ur },
    locality: r.loc_en ? { en: r.loc_en, ur: r.loc_ur ?? r.loc_en } : null,
    category: { en: r.cat_en, ur: r.cat_ur, slug: r.cat_slug },
    cover: r.cover ? `/api/files/listing-images/${r.cover}` : null,
    featured: r.featured,
    verified: r.is_verified,
    rating: Number(r.rating_avg),
    ratingCount: r.rating_count,
    approvedAt: r.approved_at,
    fields: r.custom_fields ?? {},
  };
}

export function adPath(a: { slug: string; reference: string }): string {
  return `/ad/${a.slug}-${a.reference}`;
}

// ---------------- search ----------------

export type SearchFilters = {
  q?: string;
  categorySlug?: string;
  subSlug?: string;
  model?: string;
  citySlug?: string;
  localityId?: number;
  priceMin?: number;
  priceMax?: number;
  within?: number; // days
  featuredOnly?: boolean;
  verifiedOnly?: boolean;
  fields?: Record<string, string>; // f_<key>, f_<key>_min, f_<key>_max
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  perPage?: number;
};

export async function searchAds(f: SearchFilters): Promise<{ ads: AdCard[]; total: number; page: number; pages: number }> {
  const where: string[] = [LIVE];
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const cats = await getCategories();
  const cat = f.categorySlug ? cats.find((c) => c.slug === f.categorySlug) : undefined;
  if (f.categorySlug && !cat) return { ads: [], total: 0, page: 1, pages: 0 };
  if (cat) where.push(`l.category_id = ${p(cat.id)}`);
  if (cat && f.subSlug) {
    const sub = cat.subs.find((s) => s.slug === f.subSlug);
    if (sub) where.push(`l.subcategory_id = ${p(sub.id)}`);
  }
  if (f.model) where.push(`l.model::text = ${p(f.model)}`);
  if (f.citySlug) where.push(`ci.slug = ${p(f.citySlug)}`);
  if (f.localityId) where.push(`l.locality_id = ${p(f.localityId)}`);
  if (f.q) {
    const term = f.q.trim().slice(0, 80);
    if (term) where.push(`(l.title ilike '%' || ${p(term)} || '%' or l.description ilike '%' || $${params.length} || '%')`);
  }
  if (f.priceMin) where.push(`l.price >= ${p(f.priceMin)}`);
  if (f.priceMax) where.push(`l.price <= ${p(f.priceMax)}`);
  if (f.within) where.push(`l.approved_at >= now() - make_interval(days => ${p(f.within)}::int)`);
  if (f.featuredOnly) where.push(FEATURED);
  if (f.verifiedOnly) where.push('l.is_verified');
  if (cat && f.fields) {
    for (const def of cat.fields) {
      const v = f.fields[def.key];
      if ((def.type === 'select' || def.type === 'text') && v) {
        where.push(`l.custom_fields->>'${def.key.replace(/[^a-z0-9_]/g, '')}' ilike ${p(v)}`);
      } else if (def.type === 'boolean' && v === 'true') {
        where.push(`(l.custom_fields->>'${def.key.replace(/[^a-z0-9_]/g, '')}')::boolean is true`);
      } else if (def.type === 'number' || def.type === 'year') {
        const key = def.key.replace(/[^a-z0-9_]/g, '');
        const min = Number(f.fields[`${def.key}_min`]);
        const max = Number(f.fields[`${def.key}_max`]);
        if (min > 0) where.push(`(l.custom_fields->>'${key}')::numeric >= ${p(min)}`);
        if (max > 0) where.push(`(l.custom_fields->>'${key}')::numeric <= ${p(max)}`);
      }
    }
  }
  const order =
    f.sort === 'price_asc'
      ? 'l.price asc nulls last, l.approved_at desc'
      : f.sort === 'price_desc'
        ? 'l.price desc nulls last, l.approved_at desc'
        : `${FEATURED} desc, l.approved_at desc`;
  const perPage = Math.min(f.perPage ?? 24, 60);
  const page = Math.max(1, f.page ?? 1);
  const whereSql = where.join(' and ');
  const from = `from listings l join cities ci on ci.id = l.city_id`;
  const [{ n }] = await q<{ n: number }>(`select count(*)::int as n ${from} where ${whereSql}`, params);
  const rows = await q<CardRow>(
    `${CARD_SELECT} where ${whereSql} order by ${order} limit ${perPage} offset ${(page - 1) * perPage}`,
    params,
  );
  return { ads: rows.map(toCard), total: n, page, pages: Math.ceil(n / perPage) };
}

export async function featuredAds(limit = 8): Promise<AdCard[]> {
  const rows = await q<CardRow>(`${CARD_SELECT} where ${LIVE} and ${FEATURED} order by random() limit $1`, [limit]);
  return rows.map(toCard);
}

export async function latestAds(opts: { limit?: number; model?: string; citySlug?: string; models?: string[] } = {}): Promise<AdCard[]> {
  const params: unknown[] = [opts.limit ?? 12];
  const extra: string[] = [];
  if (opts.model) {
    params.push(opts.model);
    extra.push(`l.model::text = $${params.length}`);
  }
  if (opts.models) {
    params.push(opts.models);
    extra.push(`l.model::text = any($${params.length})`);
  }
  if (opts.citySlug) {
    params.push(opts.citySlug);
    extra.push(`ci.slug = $${params.length}`);
  }
  const rows = await q<CardRow>(
    `${CARD_SELECT} where ${LIVE} ${extra.map((e) => `and ${e}`).join(' ')} order by l.approved_at desc limit $1`,
    params,
  );
  return rows.map(toCard);
}

export async function topProviders(model: 'services' | 'business', limit = 6): Promise<AdCard[]> {
  const rows = await q<CardRow>(
    `${CARD_SELECT} where ${LIVE} and l.model = $2 order by l.is_verified desc, l.rating_avg desc, l.rating_count desc, l.approved_at desc limit $1`,
    [limit, model],
  );
  return rows.map(toCard);
}

// ---------------- single ad ----------------

export type AdDetail = AdCard & {
  description: string;
  status: 'live' | 'expired' | 'sold';
  sellerName: string;
  phone: string | null;
  whatsapp: string | null;
  images: string[];
  subcategory: { en: string; ur: string; slug: string } | null;
  citySlug: string;
  categoryId: number;
  cityId: number;
  fieldDefs: MetaField[];
  views: number;
  expiresAt: string | null;
};

export async function getAdByReference(reference: string): Promise<AdDetail | null> {
  const row = await q1<CardRow & {
    description: string; status: string; expires_at: string | null; seller_name: string; seller_phone: string; show_phone: boolean;
    whatsapp_phone: string | null; sub_en: string | null; sub_ur: string | null; sub_slug: string | null; city_slug: string;
    category_id: number; city_id: number; views: number;
  }>(
    `${CARD_SELECT.replace('select l.id', `select l.description, l.status, l.expires_at, l.seller_name, l.seller_phone, l.show_phone,
            l.whatsapp_phone, s.name_en as sub_en, s.name_ur as sub_ur, s.slug as sub_slug, ci.slug as city_slug,
            l.category_id, l.city_id, l.views, l.id`)}
      left join categories s on s.id = l.subcategory_id
     where l.reference = $1 and l.status in ('approved', 'expired', 'sold')`,
    [reference.toUpperCase()],
  );
  if (!row) return null;
  const live = row.status === 'approved' && (!row.expires_at || new Date(row.expires_at) > new Date());
  const [images, cats] = await Promise.all([
    q<{ storage_path: string }>(
      'select storage_path from listing_images where listing_id = $1 and deleted_at is null order by is_cover desc, sort_order',
      [row.id],
    ),
    getCategories(),
  ]);
  return {
    ...toCard(row),
    description: row.description,
    status: live ? 'live' : row.status === 'sold' ? 'sold' : 'expired',
    sellerName: row.seller_name,
    phone: live && row.show_phone ? row.seller_phone : null,
    whatsapp: live ? row.whatsapp_phone ?? (row.show_phone ? row.seller_phone : null) : null,
    images: images.map((i) => `/api/files/listing-images/${i.storage_path}`),
    subcategory: row.sub_en ? { en: row.sub_en, ur: row.sub_ur ?? row.sub_en, slug: row.sub_slug!.split('--').pop()! } : null,
    citySlug: row.city_slug,
    categoryId: row.category_id,
    cityId: row.city_id,
    fieldDefs: cats.find((c) => c.id === row.category_id)?.fields ?? [],
    views: row.views,
    expiresAt: row.expires_at,
  };
}

export async function similarAds(ad: { id: string; categoryId: number; cityId: number }, limit = 8): Promise<AdCard[]> {
  const rows = await q<CardRow>(
    `${CARD_SELECT} where ${LIVE} and l.category_id = $1 and l.id <> $2
      order by (l.city_id = $3) desc, l.approved_at desc limit $4`,
    [ad.categoryId, ad.id, ad.cityId, limit],
  );
  return rows.map(toCard);
}

export async function countView(id: string): Promise<void> {
  await q('update listings set views = views + 1 where id = $1', [id]);
}

// ---------------- banners / home sections ----------------

export type BannerRow = {
  id: string;
  placement: string;
  owner_type: 'brand' | 'house';
  title_en: string | null;
  title_ur: string | null;
  subtitle_en: string | null;
  subtitle_ur: string | null;
  button_en: string | null;
  button_ur: string | null;
  link_url: string | null;
  image_desktop_path: string | null;
  image_mobile_path: string | null;
};

export async function getBanners(placements: string[], opts: { citySlug?: string; categoryId?: number; platform?: 'web' | 'app' } = {}): Promise<BannerRow[]> {
  const rows = await q<BannerRow>(
    `select b.id, b.placement, b.owner_type, b.title_en, b.title_ur, b.subtitle_en, b.subtitle_ur, b.button_en, b.button_ur,
            b.link_url, b.image_desktop_path, b.image_mobile_path
       from banners b
      where b.placement = any($1) and b.status = 'running'
        and (b.starts_at is null or b.starts_at <= now()) and (b.ends_at is null or b.ends_at > now())
        and b.target_platform in ('both', $4)
        and (b.target_city_ids is null or $2::text is null or exists (select 1 from cities c where c.slug = $2 and c.id = any(b.target_city_ids)))
        and (b.target_category_ids is null or $3::int is null or $3::int = any(b.target_category_ids))
      order by b.owner_type = 'brand' desc, random()`,
    [placements, opts.citySlug ?? null, opts.categoryId ?? null, opts.platform ?? 'web'],
  );
  // Count a view for paid brand banners (brands see views/clicks on their stats page)
  const brandIds = rows.filter((r) => r.owner_type === 'brand').map((r) => r.id);
  if (brandIds.length) q('select add_banner_views($1::uuid[])', [brandIds]).catch(() => {});
  return rows;
}

export type HomeSection = { key: string; is_enabled: boolean; sort_order: number; config: Record<string, unknown>; title_en: string | null; title_ur: string | null };

export async function getHomeSections(): Promise<HomeSection[]> {
  return q<HomeSection>('select key, is_enabled, sort_order, config, title_en, title_ur from homepage_sections order by sort_order');
}

// ---------------- reports ----------------

export async function reportAd(reference: string, reason: string, details: string, phone: string | null): Promise<boolean> {
  const ad = await q1<{ id: string }>(`select id from listings l where reference = $1 and ${LIVE}`, [reference.toUpperCase()]);
  if (!ad) return false;
  await q('insert into reports (listing_id, reason, details, reporter_phone) values ($1, $2, $3, $4)', [ad.id, reason, details || null, phone]);
  return true;
}
