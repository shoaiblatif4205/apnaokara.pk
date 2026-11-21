import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { q } from '@/lib/db';
import { getRishtaAccount } from '@/lib/rishta/session';
import { getPlan } from '@/lib/rishta/profiles';
import { availableMethods, type PaymentAccounts } from '@/lib/meta';
import { getSetting } from '@/lib/settings';
import { ProfileForm } from '@/components/rishta/ProfileForm';
import type { AppLocale } from '@/i18n/routing';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

// /rishta/profile/new  -> create   ·   /rishta/profile/<id>  -> edit my profile
export default async function RishtaProfileFormPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  if (!(await getRishtaAccount())) redirect(`/${locale}/rishta/login`);
  const isNew = params.id === 'new';
  if (!isNew && !/^[0-9a-f-]{36}$/.test(params.id)) redirect(`/${locale}/rishta/me`);
  const t = await getTranslations({ locale, namespace: 'rishta' });
  const [cities, locs, { plan, free }, accounts] = await Promise.all([
    q<{ id: number; name_en: string; name_ur: string }>('select id, name_en, name_ur from cities where is_active order by sort_order'),
    q<{ id: number; city_id: number; name_en: string; name_ur: string }>('select id, city_id, name_en, name_ur from localities where is_active order by sort_order'),
    getPlan(),
    getSetting<PaymentAccounts>('public.payment_accounts'),
  ]);
  const n = (o: { name_en: string; name_ur: string }) => (locale === 'ur' ? o.name_ur : o.name_en);
  return (
    <div className="container-site max-w-3xl py-6">
      <h1 className="mb-4 text-2xl font-bold">{isNew ? t('newProfile') : t('editProfile')}</h1>
      <ProfileForm
        locale={locale}
        cities={cities.map((c) => ({ id: c.id, name: n(c), localities: locs.filter((l) => l.city_id === c.id).map((l) => ({ id: l.id, name: n(l) })) }))}
        profileId={isNew ? undefined : params.id}
        plan={{ price: plan.price, days: plan.days, premium_price: plan.premium_price }}
        freeMode={free.enabled}
        methods={availableMethods(accounts ?? {})}
        accounts={accounts ?? {}}
      />
    </div>
  );
}
