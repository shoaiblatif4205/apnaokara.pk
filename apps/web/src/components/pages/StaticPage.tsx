import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import { getPage, plainSummary } from '@/lib/pages';
import { renderMarkdown } from '@/lib/markdown';
import type { PageSlug } from '@/lib/defaultPages';
import { Breadcrumbs } from '@/components/browse/Breadcrumbs';

type Params = { params: Promise<{ locale: string }> };

/** generateMetadata for an info page. */
export function pageMetadata(slug: PageSlug) {
  return async function generateMetadata(props: Params): Promise<Metadata> {
    const params = await props.params;
    const locale = params.locale as AppLocale;
    const page = await getPage(slug, locale);
    return {
      title: page.seoTitle || page.title,
      description: page.seoDescription || plainSummary(page.body),
      alternates: { canonical: `/${locale}/${slug}`, languages: { en: `/en/${slug}`, ur: `/ur/${slug}` } },
      openGraph: { title: page.title, type: 'website', url: `/${locale}/${slug}`, images: ['/og-image.png'] },
    };
  };
}

/** Shared layout: breadcrumbs, title, Markdown body, optional extra blocks. */
export async function StaticPage({
  slug,
  locale,
  before,
  after,
  showToc = true,
  bodyOverride,
}: {
  slug: PageSlug;
  locale: AppLocale;
  before?: ReactNode;
  after?: ReactNode;
  showToc?: boolean;
  bodyOverride?: string;
}) {
  noStore();
  setRequestLocale(locale);
  const page = await getPage(slug, locale);
  if (page.hidden) notFound();
  const tb = await getTranslations({ locale, namespace: 'browse' });
  const tp = await getTranslations({ locale, namespace: 'pages' });
  const { html, toc } = renderMarkdown(bodyOverride ?? page.body, { locale });
  const toc2 = toc.filter((t) => t.level === 2);

  return (
    <div className="container-site max-w-4xl py-4">
      <Breadcrumbs items={[{ label: tb('home'), href: '/' }, { label: page.title, href: `/${slug}` }]} locale={locale} />
      <h1 className="mt-3 text-2xl font-bold md:text-3xl">{page.title}</h1>
      {page.updatedAt && (
        <p className="mt-1 text-sm text-ink-muted">
          {tp('lastUpdated', { date: page.updatedAt.toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-PK', { dateStyle: 'long' }) })}
        </p>
      )}
      {before}
      {showToc && toc2.length >= 3 && (
        <nav aria-label={tp('onThisPage')} className="card mt-4 p-4">
          <p className="text-sm font-semibold">{tp('onThisPage')}</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {toc2.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="text-brand hover:underline">
                  {t.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {html.trim() && <article className="prose-ao card mt-4 p-5 md:p-8" dangerouslySetInnerHTML={{ __html: html }} />}
      {after}
      {slug !== 'contact' && (
        <p className="mt-6 text-sm text-ink-muted">
          {tp('stillQuestions')}{' '}
          <Link href="/contact" className="font-semibold text-brand underline">
            {tp('contactUs')}
          </Link>
        </p>
      )}
    </div>
  );
}

/** Default export for a plain info page route. */
export function staticPageRoute(slug: PageSlug) {
  return async function Page(props: Params) {
    const params = await props.params;
    return <StaticPage slug={slug} locale={params.locale as AppLocale} />;
  };
}
