import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getRishtaAccount } from '@/lib/rishta/session';
import { RishtaLogin } from '@/components/rishta/RishtaLogin';
import { Link, type AppLocale } from '@/i18n/routing';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'rishta' });
  const tc = await getTranslations({ locale: params.locale, namespace: 'common' });
  return { title: `${tc('rishta')}: ${t('login')}`, robots: { index: false, follow: false } };
}
export const dynamic = 'force-dynamic';

export default async function RishtaLoginPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  if (await getRishtaAccount()) redirect(`/${locale}/rishta/me`);
  const t = await getTranslations({ locale, namespace: 'rishta' });
  return (
    <div className="container-site max-w-md py-8">
      <h1 className="text-2xl font-bold">{t('login')}</h1>
      <RishtaLogin locale={locale} />
      <p className="mt-3 text-sm">
        {t('noAccount')}{' '}
        <Link href="/rishta/signup" className="font-semibold text-pink-700 underline">
          {t('signup')}
        </Link>
      </p>
    </div>
  );
}
