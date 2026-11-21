import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCategories, getCities } from '@/lib/public';
import { named } from '@/lib/format';
import { ListingsView, type SP } from '@/components/browse/ListingsView';
import type { AppLocale } from '@/i18n/routing';
import { q1 } from '@/lib/db';
import { fill, getSeo } from '@/lib/seo';
import { categoryStats, listingFaq } from '@/lib/aeo';
import { FaqBlock } from '@/components/browse/FaqBlock';

// /mobiles, /mobiles/okara, /mobiles/mobile-phones, /mobiles/mobile-phones/okara
// Unknown first segments (e.g. /about before Phase 8) show the 404 page.

type Params = { locale: string; category: string; rest?: string[] };

async function resolve(p: Params) {
  const [cats, cities] = await Promise.all([getCategories(), getCities()]);
  const category = cats.find((c) => c.slug === p.category);
  if (!category) return null;
  const rest = p.rest ?? [];
  if (rest.length > 2) return null;
  let sub: (typeof category.subs)[number] | undefined;
  let city: (typeof cities)[number] | undefined;
  if (rest[0]) {
    city = cities.find((c) => c.slug === rest[0]);
    if (!city) {
      sub = category.subs.find((s) => s.slug === rest[0]);
      if (!sub) return null;
      if (rest[1]) {
        city = cities.find((c) => c.slug === rest[1]);
        if (!city) return null;
      }
    } else if (rest[1]) return null;
  }
  return { category, sub, city };
}

function titleFor(locale: 'en' | 'ur', t: Awaited<ReturnType<typeof getTranslations>>, r: NonNullable<Awaited<ReturnType<typeof resolve>>>) {
  const what = named(r.sub ?? r.category, locale);
  return r.city ? t('inCity', { category: what, city: named(r.city, locale) }) : what;
}

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
  const params = await props.params;
  const r = await resolve(params);
  if (!r) return {};
  const locale = params.locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'browse' });
  const seo = await getSeo();
  const what = named(r.sub ?? r.category, locale);
  const title = r.city
    ? fill(seo.templates.categoryCity[locale], { category: what, city: named(r.city, locale) })
    : (!r.sub && r.category.seo_title) || fill(seo.templates.category[locale], { category: what });
  const path = `/${[params.category, ...(params.rest ?? [])].join('/')}`;
  const stats = await categoryStats({ categorySlug: r.category.slug, subSlug: r.sub?.slug, citySlug: r.city?.slug });
  const count = stats.count ? ` (${stats.count})` : '';
  const description =
    (!r.sub && !r.city && r.category.seo_description) ||
    (r.city ? `${t('forSaleIn', { category: what, city: named(r.city, locale) })}${count}` : `${titleFor(locale, t, r)}${count}: ${t('seoTitle')}`);
  // A city page with no live ads is thin: keep it out of Google until ads appear.
  const empty = !!r.city && stats.count === 0 && !seo.index_empty_city_pages;
  return {
    title,
    description,
    alternates: { canonical: `/${locale}${path}`, languages: { en: `/en${path}`, ur: `/ur${path}`, 'x-default': `/en${path}` } },
    openGraph: { title, description, url: `/${locale}${path}`, images: ['/og-image.png'] },
    robots: empty ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage(props: { params: Promise<Params>; searchParams: Promise<SP> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const r = await resolve(params);
  if (!r) notFound();
  const t = await getTranslations({ locale, namespace: 'browse' });
  const path = `/${[params.category, ...(params.rest ?? [])].join('/')}`;

  const crumbs = [{ label: t('home'), href: '/' }, { label: named(r.category, locale), href: `/${r.category.slug}` }];
  if (r.sub) crumbs.push({ label: named(r.sub, locale), href: `/${r.category.slug}/${r.sub.slug}` });
  if (r.city) crumbs.push({ label: named(r.city, locale), href: path });

  // FAQ with live numbers on the first page only (filtered / later pages are not indexed)
  const firstPage = !Object.keys(searchParams).length;
  const [stats, plan] = firstPage
    ? await Promise.all([
        categoryStats({ categorySlug: r.category.slug, subSlug: r.sub?.slug, citySlug: r.city?.slug }),
        q1<{ p: number | null }>('select min(price)::int as p from pricing where is_active and model::text = $1 and (category_id is null or category_id = $2)', [r.category.model, r.category.id]),
      ])
    : [null, null];
  const tl = await getTranslations({ locale, namespace: 'footer' });
  const faqs = stats
    ? listingFaq({
        locale,
        what: named(r.sub ?? r.category, locale),
        where: r.city ? named(r.city, locale) : locale === 'ur' ? 'اوکاڑہ، ساہیوال اور پاکپتن' : 'Okara, Sahiwal and Pakpattan',
        model: r.category.model,
        stats,
        postPrice: plan?.p ?? null,
      })
    : [];

  return (
    <>
      <ListingsView
        locale={locale}
        path={path}
        title={titleFor(locale, t, r)}
        crumbs={crumbs}
        category={r.category}
        subSlug={r.sub?.slug}
        fixedCitySlug={r.city?.slug}
        searchParams={searchParams}
      />
      <FaqBlock faqs={faqs} locale={locale} title={tl('faq')} />
    </>
  );
}
