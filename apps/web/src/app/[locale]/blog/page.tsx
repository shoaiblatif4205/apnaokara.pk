import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { BlogList } from '@/components/blog/BlogList';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const t = await getTranslations({ locale: params.locale, namespace: 'blog' });
  const page = Number(searchParams.page) || 1;
  return {
    title: page > 1 ? `${t('title')} · ${t('page', { n: page })}` : t('title'),
    description: t('intro'),
    alternates: { canonical: `/${params.locale}/blog${page > 1 ? `?page=${page}` : ''}`, languages: { en: '/en/blog', ur: '/ur/blog' } },
  };
}

export default async function BlogIndex(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  return <BlogList locale={locale} page={Number(searchParams.page) || 1} basePath="/blog" />;
}
