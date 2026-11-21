import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CheckCircle2 } from 'lucide-react';
import { getRishtaAccount } from '@/lib/rishta/session';
import { RishtaLogin } from '@/components/rishta/RishtaLogin';
import { Link, type AppLocale } from '@/i18n/routing';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'rishta' });
  return { title: t('signupTitle'), robots: { index: false, follow: true } };
}
export const dynamic = 'force-dynamic';

// Sign up = phone number + code. The account is created on first login.
export default async function RishtaSignupPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  if (await getRishtaAccount()) redirect(`/${locale}/rishta/me`);
  const t = await getTranslations({ locale, namespace: 'rishta' });
  return (
    <div className="container-site grid max-w-4xl gap-6 py-8 md:grid-cols-2">
      <div>
        <h1 className="text-2xl font-bold">{t('signupTitle')}</h1>
        <p className="mt-2 text-ink-muted">{t('signupText')}</p>
        <ol className="mt-4 space-y-2 text-sm">
          {[t('how1'), t('how2'), t('how3'), t('how4')].map((s) => (
            <li key={s} className="flex gap-2">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-pink-700" aria-hidden="true" />
              {s}
            </li>
          ))}
        </ol>
      </div>
      <div>
        <RishtaLogin locale={locale} submitLabel={t('signup')} />
        <p className="mt-3 text-sm">
          {t('haveAccount')}{' '}
          <Link href="/rishta/login" className="font-semibold text-pink-700 underline">
            {t('login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
