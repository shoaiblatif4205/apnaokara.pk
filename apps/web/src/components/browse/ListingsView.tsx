import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getBanners, getCategories, getCities, getLocalities, searchAds, type Cat, type SearchFilters } from '@/lib/public';
import { named } from '@/lib/format';
import { AdGrid } from './AdCard';
import { BannerBox } from './Banner';
import { Breadcrumbs } from './Breadcrumbs';
import { Filters } from './Filters';

export type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Read filters from the URL (?city=okara&min=1000&f_brand=Samsung&sort=price_asc&page=2). */
export function filtersFromParams(sp: SP): { filters: SearchFilters; values: Record<string, string | undefined> } {
  const values: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) values[k] = one(v);
  const num = (k: string) => {
    const n = Number.parseInt(values[k] ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) if (k.startsWith('f_') && v) fields[k.slice(2)] = v;
  const sort = values.sort === 'price_asc' || values.sort === 'price_desc' ? values.sort : 'newest';
  return {
    values,
    filters: {
      q: values.q?.slice(0, 80),
      citySlug: values.city || undefined,
      localityId: num('area'),
      priceMin: num('min'),
      priceMax: num('max'),
      within: [1, 7, 30].includes(num('within') ?? 0) ? num('within') : undefined,
      featuredOnly: values.featured === '1',
      verifiedOnly: values.verified === '1',
      fields,
      sort,
      page: num('page') ?? 1,
    },
  };
}

export async function ListingsView({
  locale,
  path,
  title,
  intro,
  crumbs,
  category,
  subSlug,
  fixedCitySlug,
  searchParams,
}: {
  locale: 'en' | 'ur';
  path: string; // e.g. /mobiles/okara (without locale)
  title: string;
  intro?: string;
  crumbs: { label: string; href: string }[];
  category?: Cat;
  subSlug?: string;
  fixedCitySlug?: string;
  searchParams: SP;
}) {
  const t = await getTranslations({ locale, namespace: 'browse' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const { filters, values } = filtersFromParams(searchParams);
  const citySlug = fixedCitySlug ?? filters.citySlug;
  const [cities, cats] = await Promise.all([getCities(), getCategories()]);
  const city = cities.find((c) => c.slug === citySlug);
  const localities = city ? await getLocalities(city.id) : [];
  const result = await searchAds({
    ...filters,
    citySlug,
    categorySlug: category?.slug ?? (values.category || undefined),
    subSlug,
  });
  const banners = await getBanners(['category_top', 'in_feed'], { citySlug, categoryId: category?.id });
  const top = banners.find((b) => b.placement === 'category_top');
  const feed = banners.find((b) => b.placement === 'in_feed');
  const sponsoredLabel = tc('sponsored');

  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...values, ...extra })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : '';
  };
  const sorts: [string, string][] = [
    ['newest', t('newest')],
    ['price_asc', t('priceLow')],
    ['price_desc', t('priceHigh')],
  ];

  return (
    <div className="container-site py-4">
      <Breadcrumbs items={crumbs} locale={locale} />
      {/* Paid strip only: no empty "your banner here" box above the ads */}
      {top && (
        <div className="mt-3 h-[110px] md:h-[140px]">
          <BannerBox banner={top} locale={locale} sponsoredLabel={sponsoredLabel} />
        </div>
      )}
      <header className="mt-3">
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('adsCount', { count: result.total })}</p>
        {intro && <p className="mt-2 max-w-3xl text-sm text-ink-muted">{intro}</p>}
      </header>

      {category && category.subs.length > 0 && (
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={category.name_en}>
          <Link
            href={`/${category.slug}${fixedCitySlug ? `/${fixedCitySlug}` : ''}`}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm ${!subSlug ? 'border-brand bg-brand-light font-semibold text-brand-dark' : 'border-line bg-white'}`}
          >
            {tc('allCategories')}
          </Link>
          {category.subs.map((s) => (
            <Link
              key={s.slug}
              href={`/${category.slug}/${s.slug}${fixedCitySlug ? `/${fixedCitySlug}` : ''}`}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm ${subSlug === s.slug ? 'border-brand bg-brand-light font-semibold text-brand-dark' : 'border-line bg-white hover:border-brand'}`}
            >
              {named(s, locale)}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside>
          <Filters
            locale={locale}
            action={`/${locale}${path}`}
            category={category}
            cities={cities}
            localities={localities}
            values={values}
            showCity={!fixedCitySlug}
          />
        </aside>
        <section aria-label={t('searchResults')}>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{t('sortBy')}:</span>
            {sorts.map(([k, label]) => (
              <Link
                key={k}
                href={`${path}${qs({ sort: k === 'newest' ? undefined : k, page: undefined })}`}
                aria-current={(filters.sort ?? 'newest') === k ? 'true' : undefined}
                className={`rounded-full border px-3 py-1 ${(filters.sort ?? 'newest') === k ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand'}`}
              >
                {label}
              </Link>
            ))}
          </div>
          {result.ads.length ? (
            <AdGrid
              ads={result.ads}
              locale={locale}
              sponsor={feed ? <BannerBox banner={feed} locale={locale} sponsoredLabel={sponsoredLabel} className="aspect-[3/4]" /> : undefined}
            />
          ) : (
            <div className="card p-10 text-center text-ink-muted">{t('noAds')}</div>
          )}
          {result.pages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Pagination">
              {result.page > 1 && (
                <Link href={`${path}${qs({ page: String(result.page - 1) })}`} className="btn-outline" rel="prev">
                  {t('prev')}
                </Link>
              )}
              <span className="text-sm text-ink-muted">{t('pageOf', { page: result.page, pages: result.pages })}</span>
              {result.page < result.pages && (
                <Link href={`${path}${qs({ page: String(result.page + 1) })}`} className="btn-outline" rel="next">
                  {t('next')}
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>

      {/* Related links (internal linking for SEO) */}
      <section className="mt-10 grid gap-6 md:grid-cols-2">
        {category && (
          <div>
            <h2 className="font-bold">{t('city')}</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {cities.map((c) => (
                <li key={c.slug}>
                  <Link href={`/${category.slug}/${c.slug}`} className="inline-flex min-h-[36px] items-center rounded-full border border-line bg-white px-3 text-sm hover:border-brand">
                    {t('inCity', { category: named(category, locale), city: named(c, locale) })}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h2 className="font-bold">{t('allCategories')}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {cats
              .filter((c) => c.slug !== category?.slug)
              .map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/${c.slug}${citySlug ? `/${citySlug}` : ''}`}
                    className="inline-flex min-h-[36px] items-center rounded-full border border-line bg-white px-3 text-sm hover:border-brand"
                  >
                    {named(c, locale)}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
