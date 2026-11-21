import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getRishtaAccount } from '@/lib/rishta/session';
import { RishtaInterests } from '@/components/rishta/RishtaInterests';
import type { AppLocale } from '@/i18n/routing';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function RishtaInterestsPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  if (!(await getRishtaAccount())) redirect(`/${locale}/rishta/login`);
  const t = await getTranslations({ locale, namespace: 'rishta' });
  return (
    <div className="container-site py-6">
      <h1 className="mb-4 text-2xl font-bold">{t('interests')}</h1>
      <RishtaInterests locale={locale} />
    </div>
  );
}
