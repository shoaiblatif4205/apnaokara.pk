import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EyeOff, Lock, PhoneCall, ShieldCheck } from 'lucide-react';
import { formatPrice } from '@apna-okara/shared';
import { Link, type AppLocale } from '@/i18n/routing';
import { getRishtaAccount } from '@/lib/rishta/session';
import { getPlan, previewProfiles } from '@/lib/rishta/profiles';
import { RishtaPreview } from '@/components/rishta/RishtaPreview';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'rishta' });
  return {
    title: t('heroTitle'),
    description: t('heroText'),
    alternates: { canonical: `/${params.locale}/rishta`, languages: { en: '/en/rishta', ur: '/ur/rishta' } },
  };
}

// The only public, indexable Rishta page.
export default async function RishtaHome(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'rishta' });
  const [account, { plan, free }, preview] = await Promise.all([getRishtaAccount(), getPlan(), previewProfiles(8)]);
  const privacy = [
    [Lock, t('privacy1')],
    [EyeOff, t('privacy2')],
    [ShieldCheck, t('privacy3')],
    [PhoneCall, t('privacy4')],
  ] as const;

  return (
    <div className="container-site py-6">
      <section className="rounded-2xl bg-[#831843] p-6 text-white md:p-10">
        <h1 className="text-3xl font-extrabold md:text-4xl">{t('heroTitle')}</h1>
        <p className="mt-3 max-w-2xl text-white/90 md:text-lg">{t('heroText')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {account ? (
            <>
              <Link href="/rishta/search" className="btn bg-white text-[#831843] hover:bg-pink-50">
                {t('search')}
              </Link>
              <Link href="/rishta/me" className="btn border border-white/60 text-white hover:bg-white/10">
                {t('myProfiles')}
              </Link>
            </>
          ) : (
            <>
              <Link href="/rishta/signup" className="btn bg-white text-[#831843] hover:bg-pink-50">
                {t('signup')}
              </Link>
              <Link href="/rishta/login" className="btn border border-white/60 text-white hover:bg-white/10">
                {t('login')}
              </Link>
            </>
          )}
        </div>
      </section>

      {preview.profiles.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="section-title">{t('latestTitle')}</h2>
            <Link href={account ? '/rishta/search' : '/rishta/signup'} className="text-sm font-semibold text-pink-700 hover:underline">
              {account ? t('search') : t('signup')}
            </Link>
          </div>
          <div className="mt-3">
            <RishtaPreview profiles={preview.profiles} locale={locale} loggedIn={!!account} total={preview.total} />
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="section-title">{t('howTitle')}</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {[t('how1'), t('how2'), t('how3'), t('how4')].map((s, i) => (
            <li key={s} className="card flex gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-700 font-bold text-white">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="section-title">{t('privacyTitle')}</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {privacy.map(([Icon, text]) => (
            <li key={text} className="card flex gap-3 p-4">
              <Icon size={22} className="shrink-0 text-pink-700" aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-8 p-6">
        <h2 className="text-lg font-bold">{t('priceTitle')}</h2>
        <p className="mt-1 text-2xl font-extrabold">
          {free.enabled ? t('freeNow') : t('priceText', { price: formatPrice(plan.price, locale), days: plan.days })}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/rishta/success" className="text-brand underline">
            {t('success')}
          </Link>
          <Link href="/rishta/rules" className="text-brand underline">
            {t('rules')}
          </Link>
        </div>
      </section>
    </div>
  );
}
