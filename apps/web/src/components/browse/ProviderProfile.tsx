import type { ReactNode } from 'react';
import { BadgeCheck, Clock, ExternalLink, Globe, MapPin, Wrench } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { AdDetail } from '@/lib/public';
import { getReviews } from '@/lib/reviews';
import { formatPrice } from '@apna-okara/shared';
import { named, timeAgo } from '@/lib/format';
import { ReviewForm, Stars } from './Reviews';

// Profile part of a service provider / business page: key info, rating summary, reviews.

export async function ProviderInfo({ ad, locale }: { ad: AdDetail; locale: 'en' | 'ur' }) {
  const t = await getTranslations({ locale, namespace: 'reviews' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const f = ad.fields;
  const mapLink = typeof f.map_link === 'string' && /^https:\/\//.test(f.map_link) ? f.map_link : null;
  const website = typeof f.website === 'string' && /^https?:\/\//.test(f.website) ? f.website : null;
  const rows: { icon: typeof Clock; label: string; value: ReactNode }[] = [];
  if (f.experience_years) rows.push({ icon: Wrench, label: t('experience', { n: String(f.experience_years) }), value: null });
  if (f.areas_served) rows.push({ icon: MapPin, label: t('areasServed'), value: String(f.areas_served) });
  if (f.timings) rows.push({ icon: Clock, label: t('timings'), value: String(f.timings) });
  if (f.address) rows.push({ icon: MapPin, label: t('address'), value: String(f.address) });
  if (f.starting_rate) rows.push({ icon: Wrench, label: t('startingRate'), value: formatPrice(Number(f.starting_rate), locale) });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {ad.verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-3 py-1 text-sm font-bold text-brand-dark" title={t('verifiedTip')}>
            <BadgeCheck size={18} aria-hidden="true" /> {tc('verified')}
          </span>
        )}
        {ad.ratingCount > 0 && (
          <a href="#reviews" className="inline-flex items-center gap-2 text-sm hover:underline">
            <Stars value={ad.rating} />
            <span className="font-bold">{ad.rating.toFixed(1)}</span>
            <span className="text-ink-muted">({ad.ratingCount})</span>
          </a>
        )}
      </div>
      {rows.length > 0 && (
        <ul className="mt-4 grid gap-2 text-sm md:grid-cols-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-start gap-2">
              <r.icon size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
              <span>
                <span className="font-semibold">{r.label}</span>
                {r.value ? <span className="block text-ink-muted">{r.value}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {(mapLink || website) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {mapLink && (
            <a href={mapLink} target="_blank" rel="noopener noreferrer" className="btn-outline">
              <ExternalLink size={16} aria-hidden="true" /> {t('openMap')}
            </a>
          )}
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="btn-outline">
              <Globe size={16} aria-hidden="true" /> {t('website')}
            </a>
          )}
        </div>
      )}
      <p className="mt-3 text-sm text-ink-muted">{named(ad.category, locale)}{ad.subcategory ? ` › ${named(ad.subcategory, locale)}` : ''}</p>
    </div>
  );
}

export async function ProviderReviews({ ad, locale }: { ad: AdDetail; locale: 'en' | 'ur' }) {
  const t = await getTranslations({ locale, namespace: 'reviews' });
  const { reviews, dist } = await getReviews(ad.id);
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  const labels = Object.fromEntries(
    ['writeReview', 'yourRating', 'star', 'yourName', 'yourPhone', 'phonePrivate', 'comment', 'commentHint', 'submit', 'thanks', 'rateRequired'].map((k) => [
      k,
      k === 'star' ? t('star', { n: '{n}' }) : t(k as never),
    ]),
  );

  return (
    <section id="reviews" className="card mt-4 scroll-mt-4 p-4 md:p-6" aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="text-lg font-bold">
        {t('title')}
      </h2>
      {total > 0 ? (
        <div className="mt-3 grid gap-4 md:grid-cols-[180px_1fr]">
          <div>
            <p className="text-4xl font-extrabold">{ad.rating.toFixed(1)}</p>
            <Stars value={ad.rating} size={20} />
            <p className="mt-1 text-sm text-ink-muted">{t('basedOn', { count: total })}</p>
          </div>
          <ul className="space-y-1 text-sm" aria-label={t('title')}>
            {[5, 4, 3, 2, 1].map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className="w-14 shrink-0">{t('star', { n: String(s) })}</span>
                <span className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                  <span className="block h-full bg-amber-400" style={{ width: `${total ? (dist[s] / total) * 100 : 0}%` }} />
                </span>
                <span className="w-6 text-end text-ink-muted">{dist[s]}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-ink-muted">{t('noReviews')}</p>
      )}

      {ad.status === 'live' && (
        <div className="mt-4">
          <ReviewForm reference={ad.reference} labels={labels} />
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="mt-6 divide-y divide-line">
          {reviews.map((r) => (
            <li key={r.id} className="py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{r.name}</span>
                <Stars value={r.rating} size={14} />
                <span className="text-xs text-ink-muted">{timeAgo(r.createdAt, locale)}</span>
              </div>
              {r.comment && <p className="mt-1 whitespace-pre-line">{r.comment}</p>}
              {r.reply && (
                <div className="mt-2 rounded-lg bg-page p-3 text-sm">
                  <p className="font-semibold">{t('reply')}</p>
                  <p className="whitespace-pre-line text-ink-muted">{r.reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
