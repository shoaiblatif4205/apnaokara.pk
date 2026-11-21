import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { q } from '@/lib/db';
import { getRishtaAccount } from '@/lib/rishta/session';
import { RishtaSearch } from '@/components/rishta/RishtaSearch';
import type { AppLocale } from '@/i18n/routing';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function RishtaSearchPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  if (!(await getRishtaAccount())) redirect(`/${locale}/rishta/login`);
  const t = await getTranslations({ locale, namespace: 'rishta' });
  const cities = await q<{ slug: string; name_en: string; name_ur: string }>('select slug, name_en, name_ur from cities where is_active order by sort_order');
  return (
    <div className="container-site py-6">
      <h1 className="mb-4 text-2xl font-bold">{t('search')}</h1>
      <RishtaSearch locale={locale} cities={cities.map((c) => ({ slug: c.slug, name: locale === 'ur' ? c.name_ur : c.name_en }))} />
    </div>
  );
}
