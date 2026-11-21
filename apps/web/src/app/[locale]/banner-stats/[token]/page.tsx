import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getBannerByToken } from '@/lib/banners';
import { PLACEMENT_INFO, type Placement } from '@/lib/bannerConfig';
import type { AppLocale } from '@/i18n/routing';

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Private stats page for a brand (link given after booking).
export default async function BannerStatsPage(props: { params: Promise<{ locale: string; token: string }> }) {
  const params = await props.params;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const b = await getBannerByToken(params.token);
  if (!b) notFound();
  const t = await getTranslations({ locale, namespace: 'advertise' });
  const statusKey: Record<string, string> = {
    pending: 'statusPending', scheduled: 'statusScheduled', running: 'statusRunning', paused: 'statusPaused', expired: 'statusExpired', rejected: 'statusRejected',
  };
  const d = (s: string | null) => (s ? new Date(s).toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium' }) : '-');
  const max = Math.max(1, ...b.days.map((x) => x.views));

  return (
    <div className="container-site max-w-3xl py-6">
      <h1 className="text-2xl font-bold">{t('statsTitle')}</h1>
      <p className="mt-1 text-ink-muted">
        {b.business_name} · {PLACEMENT_INFO[b.placement as Placement]?.[locale] ?? b.placement}
      </p>
      {b.image_desktop_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/files/banners/${b.image_desktop_path}`} alt="" className="mt-4 max-h-48 rounded-xl border border-line" />
      )}
      <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card p-4">
          <dt className="text-xs font-semibold uppercase text-ink-muted">{t('status')}</dt>
          <dd className="mt-1 font-bold">{t(statusKey[b.status] ?? 'statusPending')}</dd>
        </div>
        <div className="card p-4">
          <dt className="text-xs font-semibold uppercase text-ink-muted">{t('period')}</dt>
          <dd className="mt-1 text-sm font-semibold">
            {d(b.starts_at)} – {d(b.ends_at)}
          </dd>
        </div>
        <div className="card p-4">
          <dt className="text-xs font-semibold uppercase text-ink-muted">{t('views')}</dt>
          <dd className="mt-1 text-2xl font-bold">{b.totals.views.toLocaleString('en-PK')}</dd>
        </div>
        <div className="card p-4">
          <dt className="text-xs font-semibold uppercase text-ink-muted">{t('clicks')}</dt>
          <dd className="mt-1 text-2xl font-bold">{b.totals.clicks.toLocaleString('en-PK')}</dd>
        </div>
      </dl>
      {b.status === 'rejected' && b.reject_reason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{b.reject_reason}</p>}
      {b.days.length > 0 && (
        <section className="card mt-6 p-4">
          <h2 className="font-bold">{t('perDay')}</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {b.days.map((x) => (
              <li key={x.day} className="grid grid-cols-[90px_1fr_110px] items-center gap-2">
                <span dir="ltr">{x.day}</span>
                <span className="h-3 rounded bg-brand-light">
                  <span className="block h-3 rounded bg-brand" style={{ width: `${(x.views / max) * 100}%` }} />
                </span>
                <span className="text-end text-ink-muted">
                  {x.views} / {x.clicks}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
