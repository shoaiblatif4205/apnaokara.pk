import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getRishtaAccount } from '@/lib/rishta/session';
import { availableMethods, type PaymentAccounts } from '@/lib/meta';
import { getSetting } from '@/lib/settings';
import { MyRishta } from '@/components/rishta/MyRishta';
import type { AppLocale } from '@/i18n/routing';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function RishtaMePage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  if (!(await getRishtaAccount())) redirect(`/${locale}/rishta/login`);
  const accounts = (await getSetting<PaymentAccounts>('public.payment_accounts')) ?? {};
  return (
    <div className="container-site max-w-4xl py-6">
      <MyRishta locale={locale} methods={availableMethods(accounts)} accounts={accounts} />
    </div>
  );
}
