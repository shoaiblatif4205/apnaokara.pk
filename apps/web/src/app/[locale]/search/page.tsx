import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCategories } from '@/lib/public';
import { ListingsView, type SP } from '@/components/browse/ListingsView';
import type { AppLocale } from '@/i18n/routing';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'browse' });
  // Search result pages are not indexed (category and city pages are).
  return { title: t('searchResults'), robots: { index: false, follow: true } };
}

export default async function SearchPage(props: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'browse' });
  const q = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q)?.trim();
  const catSlug = Array.isArray(searchParams.category) ? searchParams.category[0] : searchParams.category;
  const category = catSlug ? (await getCategories()).find((c) => c.slug === catSlug) : undefined;
  return (
    <ListingsView
      locale={locale}
      path="/search"
      title={q ? t('searchFor', { q }) : t('browseAll')}
      crumbs={[
        { label: t('home'), href: '/' },
        { label: t('searchResults'), href: '/search' },
      ]}
      category={category}
      searchParams={searchParams}
    />
  );
}
