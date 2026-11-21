import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { getTag } from '@/lib/blog';
import { BlogList } from '@/components/blog/BlogList';

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ page?: string }> };

// Tag pages are thin, so they are kept out of search results.
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'blog' });
  const tag = await getTag(safeDecode(params.slug));
  return { title: tag ? t('tag', { name: tag.name }) : t('title'), robots: { index: false, follow: true } };
}

export default async function BlogTagPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'blog' });
  const tag = await getTag(safeDecode(params.slug));
  if (!tag) notFound();
  return <BlogList locale={locale} tag={tag.slug} heading={t('tag', { name: tag.name })} page={Number(searchParams.page) || 1} basePath={`/blog/tag/${tag.slug}`} />;
}
