import { AD_DURATIONS, formatPrice, models, PROVIDER_PLAN, type FreeModeSettings } from '@apna-okara/shared';
import { getTranslations } from 'next-intl/server';
import { Link, type AppLocale } from '@/i18n/routing';
import { q } from '@/lib/db';
import { getAddons } from '@/lib/pricing';
import { getSetting } from '@/lib/settings';
import { pageMetadata, StaticPage } from '@/components/pages/StaticPage';

export const generateMetadata = pageMetadata('pricing');

// Prices come straight from Admin -> Pricing, so this page is always current.
export default async function PricingPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'pages' });
  const [rows, addons, rishta, rishtaFree, free] = await Promise.all([
    q<{ model: string; duration_days: number; price: number }>(
      'select model::text, duration_days, price from pricing where is_active and category_id is null',
    ),
    getAddons(),
    getSetting<{ price: number; days: number }>('public.rishta_plan'),
    getSetting<{ enabled: boolean }>('public.rishta_free_mode'),
    getSetting<FreeModeSettings>('public.free_mode'),
  ]);
  const price = (m: string, d: number) => rows.find((r) => r.model === m && r.duration_days === d)?.price;
  const adModels = models.filter((m) => m.billing === 'per_duration');
  const freeNow = !!free?.enabled && (!free.ends_at || new Date(free.ends_at) > new Date()) && (!free.starts_at || new Date(free.starts_at) <= new Date());
  const rs = (n: number | undefined) => (n == null ? '—' : formatPrice(n, locale));

  const tables = (
    <div className="mt-4 space-y-4">
      {freeNow && <p className="rounded-xl bg-brand-light p-4 text-center font-bold text-brand-dark">{t('freeNow')}</p>}
      <section className="card p-4 md:p-6" aria-labelledby="p-ads">
        <h2 id="p-ads" className="text-lg font-bold">{t('adsTitle')}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 text-start"> </th>
                {AD_DURATIONS.map((d) => (
                  <th key={d} className="py-2 text-start">{t('days', { n: d })}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adModels.map((m) => (
                <tr key={m.key} className="border-b border-line last:border-0">
                  <td className="py-2 font-semibold">{m.name[locale]}</td>
                  {AD_DURATIONS.map((d) => (
                    <td key={d} className="py-2 tabular-nums">{rs(price(m.key, d))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4 md:p-6" aria-labelledby="p-prov">
          <h2 id="p-prov" className="text-lg font-bold">{t('providersTitle')}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {models.filter((m) => m.billing !== 'per_duration').map((m) => (
              <li key={m.key} className="flex justify-between gap-2">
                <span>{m.name[locale]} · {t('twoMonths')}</span>
                <span className="font-bold">{rs(price(m.key, PROVIDER_PLAN.days))}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-4 md:p-6" aria-labelledby="p-add">
          <h2 id="p-add" className="text-lg font-bold">{t('addonsTitle')}</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {addons.featured?.active && (
              <li>
                <p className="flex justify-between gap-2 font-semibold"><span>{locale === 'ur' ? addons.featured.name_ur : addons.featured.name_en}</span><span>+{rs(addons.featured.price)}</span></p>
                <p className="text-ink-muted">{t('featuredText')}</p>
              </li>
            )}
            {addons.whatsapp_boost?.active && (
              <li>
                <p className="flex justify-between gap-2 font-semibold"><span>{locale === 'ur' ? addons.whatsapp_boost.name_ur : addons.whatsapp_boost.name_en}</span><span>+{rs(addons.whatsapp_boost.price)}</span></p>
                <p className="text-ink-muted">{t('boostText')}</p>
              </li>
            )}
          </ul>
        </section>
        {rishta && (
          <section className="card p-4 md:p-6" aria-labelledby="p-rishta">
            <h2 id="p-rishta" className="text-lg font-bold">{t('rishtaTitle')}</h2>
            <p className="mt-3 text-2xl font-bold">{rishtaFree?.enabled ? (locale === 'ur' ? 'مفت' : 'Free') : rs(rishta.price)}</p>
            <p className="text-sm text-ink-muted">{t('rishtaFor', { n: rishta.days })}</p>
          </section>
        )}
        <section className="card p-4 md:p-6" aria-labelledby="p-ban">
          <h2 id="p-ban" className="text-lg font-bold">{t('bannersTitle')}</h2>
          <p className="mt-3 text-sm text-ink-muted">{t('bannersText')}</p>
          <Link href="/advertise" className="btn-outline mt-3">{t('seeBannerPrices')}</Link>
        </section>
      </div>
    </div>
  );

  return <StaticPage slug="pricing" locale={locale} after={tables} showToc={false} />;
}
