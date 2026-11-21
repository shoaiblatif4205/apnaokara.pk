import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SavedAds } from '@/components/browse/SavedAds';
import type { AppLocale } from '@/i18n/routing';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'browse' });
  return { title: t('favourites'), robots: { index: false } };
}

export default async function SavedPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'browse' });
  return (
    <div className="container-site py-6">
      <h1 className="text-2xl font-bold">{t('favourites')}</h1>
      <SavedAds empty={t('noFavourites')} removeLabel={t('saved')} saveLabel={t('save')} />
    </div>
  );
}
