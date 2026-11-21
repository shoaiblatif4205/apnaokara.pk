import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { formatPrice } from '@apna-okara/shared';
import { getBannerPrices, type BannerSettings } from '@/lib/banners';
import { PLACEMENT_INFO, type Placement } from '@/lib/bannerConfig';
import { availableMethods, type PaymentAccounts } from '@/lib/meta';
import { getCategories, getCities } from '@/lib/public';
import { getSetting } from '@/lib/settings';
import { BannerBookingForm } from '@/components/browse/BannerBookingForm';
import { Breadcrumbs } from '@/components/browse/Breadcrumbs';
import type { AppLocale } from '@/i18n/routing';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'advertise' });
  return {
    title: t('title'),
    description: t('intro'),
    alternates: { canonical: `/${params.locale}/advertise`, languages: { en: '/en/advertise', ur: '/ur/advertise' } },
  };
}

export default async function AdvertisePage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'advertise' });
  const tb = await getTranslations({ locale, namespace: 'browse' });
  const [prices, settings, accounts, cities, cats, contact] = await Promise.all([
    getBannerPrices(),
    getSetting<BannerSettings>('public.banner_settings'),
    getSetting<PaymentAccounts>('public.payment_accounts'),
    getCities(),
    getCategories(),
    getSetting<{ whatsapp?: string | null }>('public.contact'),
  ]);
  const placements = [...new Set(prices.map((p) => p.placement))] as Placement[];

  return (
    <div className="container-site max-w-4xl py-4">
      <Breadcrumbs items={[{ label: tb('home'), href: '/' }, { label: t('title'), href: '/advertise' }]} locale={locale} />
      <h1 className="mt-3 text-2xl font-bold md:text-3xl">{t('title')}</h1>
      <p className="mt-2 text-ink-muted">{t('intro')}</p>

      <section className="card mt-6 p-4 md:p-6" aria-labelledby="places">
        <h2 id="places" className="text-lg font-bold">
          {t('placesTitle')}
        </h2>
        {placements.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-start">
                  <th className="py-2 text-start"> </th>
                  <th className="py-2 text-start">{t('size')}</th>
                  {[7, 15, 30].map((d) => (
                    <th key={d} className="py-2 text-start">
                      {t('days', { n: d })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {placements.map((p) => (
                  <tr key={p} className="border-b border-line">
                    <td className="py-2 font-semibold">{PLACEMENT_INFO[p][locale]}</td>
                    <td className="py-2 text-ink-muted" dir="ltr">
                      {PLACEMENT_INFO[p].size}
                    </td>
                    {[7, 15, 30].map((d) => {
                      const pr = prices.find((x) => x.placement === p && x.days === d);
                      return (
                        <td key={d} className="py-2">
                          {pr ? formatPrice(pr.price, locale) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-ink-muted">
            {t('noPrices')}
            {contact?.whatsapp && (
              <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '').replace(/^0/, '92')}`} className="ms-2 font-semibold text-brand underline">
                WhatsApp
              </a>
            )}
          </p>
        )}
      </section>

      {placements.length > 0 && (
        <BannerBookingForm
          locale={locale}
          prices={prices}
          designPrice={settings?.design_price ?? null}
          methods={availableMethods(accounts ?? {})}
          accounts={accounts ?? {}}
          cities={cities.map((c) => ({ id: c.id, name: locale === 'ur' ? c.name_ur : c.name_en }))}
          categories={cats.map((c) => ({ id: c.id, name: locale === 'ur' ? c.name_ur : c.name_en }))}
        />
      )}
    </div>
  );
}
