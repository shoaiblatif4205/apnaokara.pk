import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Eye, MapPin, ShieldAlert } from 'lucide-react';
import { adPath, countView, getAdByReference, similarAds } from '@/lib/public';
import { named, priceLabel, timeAgo } from '@/lib/format';
import { AdCard } from '@/components/browse/AdCard';
import { Breadcrumbs } from '@/components/browse/Breadcrumbs';
import { ContactButtons, Gallery, ReportForm, ShareButton } from '@/components/browse/AdActions';
import { FavoriteButton } from '@/components/browse/FavoriteButton';
import { ProviderInfo, ProviderReviews } from '@/components/browse/ProviderProfile';

// Keys shown in the provider info block instead of the generic details table
const PROFILE_KEYS = ['experience_years', 'areas_served', 'timings', 'address', 'map_link', 'website', 'starting_rate'];
import { Link, type AppLocale } from '@/i18n/routing';
import { fill, getSeo, ld } from '@/lib/seo';

const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://apnaokara.pk';
const refFrom = (slug: string) => slug.match(/(AO-\d{4,10})$/i)?.[1]?.toUpperCase() ?? null;

export async function generateMetadata(props: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const ref = refFrom(params.slug);
  const ad = ref ? await getAdByReference(ref) : null;
  if (!ad) return {};
  const locale = params.locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'browse' });
  const tr = (k: string) => t(k as never);
  const place = named(ad.city, locale);
  const provider = ad.model === 'services' || ad.model === 'business';
  const seo = await getSeo();
  const vars = {
    title: ad.title,
    price: priceLabel(ad, locale, tr),
    city: place,
    category: named(ad.subcategory ?? ad.category, locale),
    rating: ad.ratingCount ? `(${ad.rating.toFixed(1)}★)` : '',
  };
  const title = fill(seo.templates[provider ? 'provider' : 'ad'][locale], vars);
  const description = `${vars.price && !provider ? `${vars.price} · ` : ''}${place} · ${(ad.description || ad.title).replace(/\s+/g, ' ')}`.slice(0, 158);
  const path = adPath(ad);
  return {
    title,
    description,
    alternates: { canonical: `/${locale}${path}`, languages: { en: `/en${path}`, ur: `/ur${path}` } },
    robots: ad.status === 'live' && !ad.sample ? undefined : { index: false, follow: true },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/${locale}${path}`,
      images: ad.images[0] ? [{ url: ad.images[0], alt: ad.title }] : ['/og-image.png'],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ad.images[0] ?? '/og-image.png'] },
  };
}

export default async function AdPage(props: { params: Promise<{ locale: string; slug: string }> }) {
  const params = await props.params;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const ref = refFrom(params.slug);
  if (!ref) notFound();
  const ad = await getAdByReference(ref);
  if (!ad) notFound();
  if (params.slug !== `${ad.slug}-${ad.reference}`) permanentRedirect(`/${locale}${adPath(ad)}`);

  const t = await getTranslations({ locale, namespace: 'browse' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const tp = await getTranslations({ locale, namespace: 'post' });
  const tr = (k: string, v?: Record<string, string | number>) => t(k as never, v as never);
  const similar = await similarAds(ad, ad.status === 'live' ? 8 : 12);
  if (ad.status === 'live') await countView(ad.id).catch(() => {});

  const place = ad.locality ? `${named(ad.locality, locale)}, ${named(ad.city, locale)}` : named(ad.city, locale);
  const price = priceLabel(ad, locale, tr);
  const url = `${site}/${locale}${adPath(ad)}`;
  const labels = Object.fromEntries(
    ['whatsapp', 'showNumber', 'share', 'copied', 'report', 'reportReason', 'reportFraud', 'reportWrongCategory', 'reportSold',
      'reportOffensive', 'reportDuplicate', 'reportOther', 'reportDetails', 'reportSend', 'reportThanks'].map((k) => [
      k,
      k === 'whatsapp' ? t('whatsappSeller') : t(k as never),
    ]),
  );

  const crumbs = [
    { label: t('home'), href: '/' },
    { label: named(ad.category, locale), href: `/${ad.category.slug}` },
    ...(ad.subcategory ? [{ label: named(ad.subcategory, locale), href: `/${ad.category.slug}/${ad.subcategory.slug}` }] : []),
    { label: ad.title, href: adPath(ad) },
  ];

  const provider = ad.model === 'services' || ad.model === 'business';
  const fieldRows = Object.entries(ad.fields)
    .filter(([k]) => !provider || !PROFILE_KEYS.includes(k))
    .map(([k, v]) => {
      const def = ad.fieldDefs.find((d) => d.key === k);
      if (!def) return null;
      let value = String(v);
      if (typeof v === 'boolean') value = v ? tp('yes') : tp('no');
      else if (def.type === 'select') value = (locale === 'ur' ? def.options?.find((o) => o.en === v)?.ur : undefined) ?? String(v);
      const unit = locale === 'ur' ? def.unit_ur : def.unit_en;
      return { label: locale === 'ur' ? def.label_ur : def.label_en, value: unit ? `${value} ${unit}` : value };
    })
    .filter(Boolean) as { label: string; value: string }[];

  // Structured data for Google / AI search
  const offer = ad.price
    ? { '@type': 'Offer', price: ad.price, priceCurrency: 'PKR', availability: ad.status === 'live' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut', url }
    : undefined;
  let jsonLd: Record<string, unknown>;
  if (ad.model === 'jobs') {
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: ad.title,
      description: ad.description || ad.title,
      datePosted: ad.approvedAt,
      validThrough: ad.expiresAt ?? undefined,
      hiringOrganization: { '@type': 'Organization', name: ad.sellerName },
      jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: ad.city.en, addressRegion: 'Punjab', addressCountry: 'PK' } },
      ...(ad.fields.salary_from ? { baseSalary: { '@type': 'MonetaryAmount', currency: 'PKR', value: { '@type': 'QuantitativeValue', minValue: ad.fields.salary_from, maxValue: ad.fields.salary_to ?? ad.fields.salary_from, unitText: 'MONTH' } } } : {}),
    };
  } else if (ad.model === 'services' || ad.model === 'business') {
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: ad.title,
      description: ad.description || ad.title,
      image: ad.images[0] ? `${site}${ad.images[0]}` : undefined,
      telephone: ad.phone ?? undefined,
      address: {
        '@type': 'PostalAddress',
        ...(typeof ad.fields.address === 'string' ? { streetAddress: ad.fields.address } : {}),
        addressLocality: ad.city.en,
        addressRegion: 'Punjab',
        addressCountry: 'PK',
      },
      ...(typeof ad.fields.timings === 'string' ? { openingHours: ad.fields.timings } : {}),
      ...(ad.ratingCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: ad.rating, reviewCount: ad.ratingCount, bestRating: 5 } } : {}),
      url,
    };
  } else {
    const f = ad.fields;
    const condition = f.condition === 'New' ? 'https://schema.org/NewCondition' : f.condition === 'Used' ? 'https://schema.org/UsedCondition' : undefined;
    const fullOffer = offer && {
      ...offer,
      ...(condition ? { itemCondition: condition } : {}),
      seller: { '@type': 'Person', name: ad.sellerName },
      areaServed: { '@type': 'City', name: ad.city.en },
      ...(ad.expiresAt ? { priceValidUntil: new Date(ad.expiresAt).toISOString().slice(0, 10) } : {}),
    };
    const base = {
      '@context': 'https://schema.org',
      name: ad.title,
      description: ad.description || ad.title,
      image: ad.images.map((i) => `${site}${i}`),
      url,
      sku: ad.reference,
      category: [ad.category.en, ad.subcategory?.en].filter(Boolean).join(' > '),
      ...(fullOffer ? { offers: fullOffer } : {}),
    };
    if (ad.model === 'vehicles') {
      // Vehicle is a Product, so Google can still show price and image.
      jsonLd = {
        ...base,
        '@type': ['Product', ad.subcategory?.en?.match(/car/i) ? 'Car' : 'Vehicle'],
        ...(f.make ? { brand: { '@type': 'Brand', name: String(f.make) } } : {}),
        ...(f.model ? { model: String(f.model) } : {}),
        ...(f.year ? { vehicleModelDate: String(f.year), productionDate: String(f.year) } : {}),
        ...(f.km_driven ? { mileageFromOdometer: { '@type': 'QuantitativeValue', value: Number(f.km_driven), unitCode: 'KMT' } } : {}),
        ...(f.fuel ? { fuelType: String(f.fuel) } : {}),
        ...(condition ? { itemCondition: condition } : {}),
      };
    } else if (ad.model === 'property') {
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: ad.title,
        description: ad.description || ad.title,
        image: ad.images.map((i) => `${site}${i}`),
        url,
        datePosted: ad.approvedAt,
        ...(fullOffer ? { offers: fullOffer } : {}),
        about: {
          '@type': ad.category.slug.includes('rent') ? 'Accommodation' : 'Place',
          name: ad.title,
          address: { '@type': 'PostalAddress', addressLocality: ad.locality?.en ?? ad.city.en, addressRegion: 'Punjab', addressCountry: 'PK' },
          ...(f.area_size ? { floorSize: { '@type': 'QuantitativeValue', value: Number(f.area_size), unitText: String(f.area_unit ?? 'Marla') } } : {}),
          ...(f.bedrooms ? { numberOfRooms: Number(f.bedrooms), numberOfBedrooms: Number(f.bedrooms) } : {}),
          ...(f.bathrooms ? { numberOfBathroomsTotal: Number(f.bathrooms) } : {}),
        },
      };
    } else {
      jsonLd = {
        ...base,
        '@type': 'Product',
        ...(typeof f.brand === 'string' ? { brand: { '@type': 'Brand', name: f.brand } } : {}),
        ...(condition ? { itemCondition: condition } : {}),
      };
    }
  }

  return (
    <div className="container-site py-4">
      {!ad.sample && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(jsonLd) }} />}
      <Breadcrumbs items={crumbs} locale={locale} />

      {ad.sample && (
        <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
          <div>
            <p className="text-lg font-bold text-sky-900">{t('sampleTitle')}</p>
            <p className="text-sm text-sky-900">{t('sampleText')}</p>
          </div>
          <Link href="/post-ad" className="btn-primary">{t('samplePost')}</Link>
        </div>
      )}

      {ad.status !== 'live' && (
        <div role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-lg font-bold text-amber-900">{ad.status === 'sold' ? t('soldTitle') : t('expiredTitle')}</p>
          <p className="text-sm text-amber-900">{t('expiredText')}</p>
        </div>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <Gallery images={ad.images} title={ad.title} />

          <section className="card mt-4 p-4 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {ad.featured && <span className="rounded bg-accent px-2 py-0.5 text-xs font-bold text-white">{tc('featured')}</span>}
                {provider ? (
                  <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{ad.title}</h1>
                ) : (
                  <>
                    <p className="mt-1 text-3xl font-extrabold">{price}</p>
                    {ad.priceType === 'negotiable' && <p className="text-sm text-ink-muted">{t('negotiable')}</p>}
                    <h1 className="mt-2 text-xl font-bold md:text-2xl">{ad.title}</h1>
                  </>
                )}
                <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} aria-hidden="true" /> {place}
                  </span>
                  <span>{timeAgo(ad.approvedAt, locale)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={14} aria-hidden="true" /> {t('views', { count: ad.views + 1 })}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <FavoriteButton
                  fav={{ reference: ad.reference, path: adPath(ad), title: ad.title, price, cover: ad.images[0] ?? null, place }}
                  labelSave={t('save')}
                  labelSaved={t('saved')}
                  withText
                />
                <ShareButton title={ad.title} labels={labels} />
              </div>
            </div>

            {provider && (
              <div className="mt-4 border-t border-line pt-4">
                <ProviderInfo ad={ad} locale={locale} />
              </div>
            )}

            {fieldRows.length > 0 && (
              <>
                <h2 className="mt-6 text-lg font-bold">{t('details')}</h2>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
                  {fieldRows.map((r) => (
                    <div key={r.label} className="border-b border-line pb-2">
                      <dt className="text-ink-muted">{r.label}</dt>
                      <dd className="font-semibold">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            {ad.description && (
              <>
                <h2 className="mt-6 text-lg font-bold">{t('description')}</h2>
                <p className="mt-2 whitespace-pre-line text-ink">{ad.description}</p>
              </>
            )}
            <p className="mt-6 text-xs text-ink-muted" dir="ltr">
              {t('adId')}: {ad.reference}
            </p>
          </section>
          {provider && <ProviderReviews ad={ad} locale={locale} />}
        </div>

        <aside className="space-y-4">
          <section className="card p-4">
            <p className="text-sm text-ink-muted">{t('postedBy')}</p>
            <p className="text-lg font-bold">{ad.sellerName}</p>
            {ad.status === 'live' && !ad.sample && (
              <div className="mt-4">
                <ContactButtons phone={ad.phone} whatsapp={ad.whatsapp} waText={t('waMessage', { title: ad.title, url })} labels={labels} />
              </div>
            )}
          </section>
          <section className="card p-4">
            <h2 className="flex items-center gap-2 font-bold">
              <ShieldAlert size={18} className="text-accent" aria-hidden="true" /> {t('safetyTitle')}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{t('safetyText')}</p>
            {ad.status === 'live' && (
              <div className="mt-3 border-t border-line pt-3">
                <ReportForm reference={ad.reference} labels={labels} />
              </div>
            )}
          </section>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title">{t('similar')}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {similar.map((s) => (
              <li key={s.id}>
                <AdCard ad={s} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
