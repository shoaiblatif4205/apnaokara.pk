import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getRishtaAccount } from '@/lib/rishta/session';
import { RishtaView } from '@/components/rishta/RishtaView';
import type { AppLocale } from '@/i18n/routing';

export const metadata: Metadata = { title: 'Rishta', robots: { index: false, follow: false, noimageindex: true } };
export const dynamic = 'force-dynamic';

export default async function RishtaProfilePage(props: { params: Promise<{ locale: string; ref: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  if (!/^R-\d{3,10}$/i.test(params.ref)) notFound();
  if (!(await getRishtaAccount())) redirect(`/${locale}/rishta/login`);
  return (
    <div className="container-site py-6">
      <RishtaView reference={params.ref.toUpperCase()} locale={locale} />
    </div>
  );
}
