import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { getBlogCategories } from '@/lib/blog';
import { named } from '@/lib/format';
import { BlogList } from '@/components/blog/BlogList';

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'blog' });
  const cat = (await getBlogCategories(locale)).find((c) => c.slug === params.slug);
  if (!cat) return {};
  const path = `/blog/category/${cat.slug}`;
  return {
    title: `${named(cat, locale)} · ${t('title')}`,
    alternates: { canonical: `/${locale}${path}`, languages: { en: `/en${path}`, ur: `/ur${path}` } },
    robots: cat.posts ? undefined : { index: false },
  };
}

export default async function BlogCategoryPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const cat = (await getBlogCategories(locale)).find((c) => c.slug === params.slug);
  if (!cat) notFound();
  return <BlogList locale={locale} category={cat.slug} heading={named(cat, locale)} page={Number(searchParams.page) || 1} basePath={`/blog/category/${cat.slug}`} />;
}
