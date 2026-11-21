import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { availableMethods } from '@/lib/meta';
import { getSetting } from '@/lib/settings';
import type { PaymentAccounts } from '@/lib/meta';
import { MyAdLookup } from '@/components/post/MyAdLookup';
import type { AppLocale } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'myAds' });
  return { title: t('title'), robots: { index: false } };
}

export default async function MyAdPage(props: { params: Promise<{ locale: string }>; searchParams: Promise<{ ref?: string; key?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  noStore(); // always fresh payment details
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const accounts = (await getSetting<PaymentAccounts>('public.payment_accounts')) ?? {};
  return (
    <section className="container-site max-w-3xl py-6">
      <MyAdLookup locale={locale} initialRef={searchParams.ref} initialKey={searchParams.key} paymentMethods={availableMethods(accounts)} />
    </section>
  );
}
