import type { ReactNode } from 'react';
import { BadgeCheck, ImageOff, MapPin, Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { adPath, type AdCard as Ad } from '@/lib/public';
import { named, priceLabel, timeAgo } from '@/lib/format';
import { FavoriteButton } from './FavoriteButton';

export async function AdCard({ ad, locale, large = false }: { ad: Ad; locale: 'en' | 'ur'; large?: boolean }) {
  const t = await getTranslations({ locale, namespace: 'browse' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const tr = (k: string, v?: Record<string, string | number>) => t(k as never, v as never);
  const place = ad.locality ? `${named(ad.locality, locale)}, ${named(ad.city, locale)}` : named(ad.city, locale);
  const price = priceLabel(ad, locale, tr);
  const provider = ad.model === 'services' || ad.model === 'business';

  return (
    <article className={`card group relative flex h-full flex-col overflow-hidden hover:shadow-md ${ad.featured ? 'border-2 border-accent-bright' : ''}`}>
      <Link href={adPath(ad)} className="flex h-full flex-col">
        <div className={`relative ${large ? 'aspect-[4/3]' : 'aspect-[4/3]'} bg-page`}>
          {ad.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.cover} alt={`${ad.title} - ${place}`} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-ink-muted">
              <ImageOff size={32} aria-hidden="true" />
            </span>
          )}
          {ad.featured && (
            <span className="absolute start-2 top-2 rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-white">{tc('featured')}</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          {!provider && <p className="text-lg font-extrabold text-ink">{price}</p>}
          <h3 className={`line-clamp-2 font-semibold leading-snug ${provider ? 'text-base' : 'text-sm text-ink-muted'}`}>{ad.title}</h3>
          {provider && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              {ad.ratingCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Star size={14} className="fill-amber-400 text-amber-500" aria-hidden="true" />
                  {ad.rating.toFixed(1)} ({ad.ratingCount})
                </span>
              )}
              {ad.verified && (
                <span className="inline-flex items-center gap-1 font-semibold text-brand">
                  <BadgeCheck size={14} aria-hidden="true" />
                  {tc('verified')}
                </span>
              )}
            </p>
          )}
          <p className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-ink-muted">
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin size={12} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{place}</span>
            </span>
            <span className="shrink-0">{timeAgo(ad.approvedAt, locale)}</span>
          </p>
        </div>
      </Link>
      <div className="absolute end-2 top-2">
        <FavoriteButton
          fav={{ reference: ad.reference, path: adPath(ad), title: ad.title, price, cover: ad.cover, place }}
          labelSave={t('save')}
          labelSaved={t('saved')}
        />
      </div>
    </article>
  );
}

/** Grid with a sponsored / house slot after every 8 ads. */
export async function AdGrid({ ads, locale, sponsor }: { ads: Ad[]; locale: 'en' | 'ur'; sponsor?: ReactNode }) {
  const items: ReactNode[] = [];
  ads.forEach((ad, i) => {
    items.push(
      <li key={ad.id}>
        <AdCard ad={ad} locale={locale} />
      </li>,
    );
    if (sponsor && (i + 1) % 8 === 0 && i < ads.length - 1) items.push(<li key={`s${i}`}>{sponsor}</li>);
  });
  return <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items}</ul>;
}
