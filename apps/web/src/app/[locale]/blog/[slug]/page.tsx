import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, type AppLocale } from '@/i18n/routing';
import { countPostView, getPost, relatedPosts } from '@/lib/blog';
import { renderMarkdown } from '@/lib/markdown';
import { plainSummary } from '@/lib/pages';
import { searchAds } from '@/lib/public';
import { named } from '@/lib/format';
import { Breadcrumbs } from '@/components/browse/Breadcrumbs';
import { AdCard } from '@/components/browse/AdCard';
import { BlogCard, formatPostDate } from '@/components/blog/BlogCard';
import { SITE_URL } from '@/lib/seo';

const site = SITE_URL;
type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const post = await getPost(decodeURIComponent(params.slug));
  if (!post) return {};
  const path = `/blog/${post.slug}`;
  const languages: Record<string, string> = { [post.locale]: `/${post.locale}${path}` };
  if (post.translation) languages[post.translation.locale] = `/${post.translation.locale}/blog/${post.translation.slug}`;
  const description = post.seoDescription || post.excerpt || plainSummary(post.body);
  return {
    title: post.seoTitle || post.title,
    description,
    keywords: post.focusKeyword ? [post.focusKeyword] : undefined,
    alternates: { canonical: `/${post.locale}${path}`, languages },
    robots: post.noindex ? { index: false, follow: true } : undefined,
    twitter: { card: 'summary_large_image', images: [post.cover ?? '/og-image.png'] },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: [{ url: post.cover ?? '/og-image.png' }],
      locale: post.locale === 'ur' ? 'ur_PK' : 'en_PK',
    },
  };
}

export default async function BlogPostPage(props: Props) {
  const params = await props.params;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const post = await getPost(decodeURIComponent(params.slug));
  if (!post) notFound();
  // Each post lives under the language it is written in.
  if (post.locale !== locale) redirect(`/${post.locale}/blog/${encodeURIComponent(post.slug)}`);
  countPostView(post.id);

  const t = await getTranslations({ locale, namespace: 'blog' });
  const tb = await getTranslations({ locale, namespace: 'browse' });
  const tp = await getTranslations({ locale, namespace: 'pages' });
  const { html, toc } = renderMarkdown(post.body, { locale });
  const [related, ads] = await Promise.all([
    relatedPosts(post, 3),
    post.relatedCategorySlug ? searchAds({ categorySlug: post.relatedCategorySlug, subSlug: post.relatedSubSlug ?? undefined, perPage: 4 }).then((r) => r.ads) : Promise.resolve([]),
  ]);

  const crumbs = [{ label: tb('home'), href: '/' }, { label: t('title'), href: '/blog' }];
  if (post.category) crumbs.push({ label: named(post.category, locale), href: `/blog/category/${post.category.slug}` });
  crumbs.push({ label: post.title, href: `/blog/${post.slug}` });

  const url = `${site}/${post.locale}/blog/${post.slug}`;
  const ld: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.seoDescription || post.excerpt || plainSummary(post.body),
      image: post.cover ? [`${site}${post.cover}`] : undefined,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      inLanguage: post.locale,
      mainEntityOfPage: url,
      url,
      keywords: [post.focusKeyword, ...post.tags.map((x) => x.name)].filter(Boolean).join(', ') || undefined,
      articleSection: post.category ? named(post.category, locale) : undefined,
      author: { '@type': post.author && !/team|apna okara/i.test(post.author.name) ? 'Person' : 'Organization', name: post.author?.name ?? 'Apna Okara' },
      publisher: { '@type': 'Organization', name: 'Apna Okara', url: site, logo: { '@type': 'ImageObject', url: `${site}/icon.png` } },
    },
  ];
  if (post.faq.length) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }

  return (
    <div className="container-site py-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <Breadcrumbs items={crumbs} locale={locale} />
      <article className="mx-auto mt-4 max-w-3xl">
        <header>
          {post.category && (
            <Link href={`/blog/category/${post.category.slug}`} className="text-sm font-semibold text-brand hover:underline">
              {named(post.category, locale)}
            </Link>
          )}
          <h1 className={`mt-1 text-2xl font-bold md:text-4xl ${locale === 'ur' ? 'leading-[1.9]' : 'leading-tight'}`}>{post.title}</h1>
          <p className="mt-3 text-sm text-ink-muted">
            {post.author && <>{t('by', { name: post.author.name })} · </>}
            <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt, locale)}</time> · {t('minRead', { n: post.readingMinutes })}
          </p>
          {post.translation && (
            <p className="mt-2 text-sm">
              <a href={`/${post.translation.locale}/blog/${post.translation.slug}`} hrefLang={post.translation.locale} className="font-semibold text-brand underline">
                {t('otherLanguage')}
              </a>
            </p>
          )}
        </header>

        {post.excerpt && (
          <aside className="mt-5 rounded-xl border-s-4 border-brand bg-brand-light/50 p-4" aria-label={t('quickAnswer')}>
            <p className="text-sm font-bold text-brand-dark">{t('quickAnswer')}</p>
            <p className="mt-1">{post.excerpt}</p>
          </aside>
        )}

        {post.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover} alt={post.title} className="mt-5 aspect-[16/9] w-full rounded-xl object-cover" />
        )}

        {toc.length >= 3 && (
          <nav aria-label={tp('onThisPage')} className="card mt-5 p-4">
            <p className="text-sm font-semibold">{tp('onThisPage')}</p>
            <ol className="mt-2 space-y-1 text-sm">
              {toc.map((x) => (
                <li key={x.id} className={x.level === 3 ? 'ms-4' : ''}>
                  <a href={`#${x.id}`} className="text-brand hover:underline">
                    {x.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="prose-ao mt-6" dangerouslySetInnerHTML={{ __html: html }} />

        {post.faq.length > 0 && (
          <section className="mt-10" aria-labelledby="post-faq">
            <h2 id="post-faq" className="text-xl font-bold">
              {t('faqTitle')}
            </h2>
            <div className="mt-3 space-y-2">
              {post.faq.map((f) => (
                <details key={f.q} className="card p-4">
                  <summary className="cursor-pointer font-semibold">{f.q}</summary>
                  <p className="mt-2 text-ink-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{t('tags')}:</span>
            {post.tags.map((x) => (
              <Link key={x.slug} href={`/blog/tag/${x.slug}`} className="rounded-full border border-line bg-white px-3 py-1 hover:border-brand">
                #{x.name}
              </Link>
            ))}
          </div>
        )}

        {post.author?.bio && (
          <aside className="card mt-8 p-4 text-sm">
            <p className="font-semibold">{post.author.name}</p>
            <p className="mt-1 text-ink-muted">{post.author.bio}</p>
          </aside>
        )}
      </article>

      {ads.length > 0 && (
        <section className="mt-12" aria-labelledby="post-ads">
          <h2 id="post-ads" className="section-title">
            {t('relatedAds')}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {ads.map((a) => (
              <AdCard key={a.id} ad={a} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="post-related">
          <h2 id="post-related" className="section-title">
            {t('related')}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <BlogCard key={p.id} post={p} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
