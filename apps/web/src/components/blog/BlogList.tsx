import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getBlogCategories, listPosts } from '@/lib/blog';
import { named } from '@/lib/format';
import { Breadcrumbs } from '@/components/browse/Breadcrumbs';
import { BlogCard } from './BlogCard';

/** Blog index, category and tag pages share this. */
export async function BlogList({
  locale,
  category,
  tag,
  page,
  heading,
  basePath,
}: {
  locale: 'en' | 'ur';
  category?: string;
  tag?: string;
  page: number;
  heading?: string;
  basePath: string;
}) {
  const t = await getTranslations({ locale, namespace: 'blog' });
  const tb = await getTranslations({ locale, namespace: 'browse' });
  const [cats, list] = await Promise.all([getBlogCategories(locale), listPosts({ locale, category, tag, page })]);
  const crumbs = [{ label: tb('home'), href: '/' }, { label: t('title'), href: '/blog' }];
  if (heading) crumbs.push({ label: heading, href: basePath });
  const pageHref = (n: number) => (n === 1 ? basePath : `${basePath}?page=${n}`);

  return (
    <div className="container-site py-4">
      <Breadcrumbs items={crumbs} locale={locale} />
      <h1 className="mt-3 text-2xl font-bold md:text-3xl">{heading ?? t('title')}</h1>
      {!heading && <p className="mt-2 max-w-3xl text-ink-muted">{t('intro')}</p>}

      <nav aria-label={t('title')} className="-mx-4 mt-4 overflow-x-auto px-4">
        <ul className="flex gap-2 whitespace-nowrap">
          <li>
            <Link href="/blog" className={`inline-flex min-h-[40px] items-center rounded-full border px-4 text-sm font-semibold ${!category && !tag ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand'}`}>
              {t('all')}
            </Link>
          </li>
          {cats.filter((c) => c.posts > 0 || c.slug === category).map((c) => (
            <li key={c.slug}>
              <Link
                href={`/blog/category/${c.slug}`}
                aria-current={c.slug === category ? 'page' : undefined}
                className={`inline-flex min-h-[40px] items-center rounded-full border px-4 text-sm font-semibold ${c.slug === category ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand'}`}
              >
                {named(c, locale)} <span className="ms-1 opacity-70">({c.posts})</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {list.posts.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.posts.map((p) => (
            <BlogCard key={p.id} post={p} locale={locale} />
          ))}
        </div>
      ) : (
        <p className="card mt-6 p-6 text-ink-muted">{t('empty')}</p>
      )}

      {list.pages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
          {list.page > 1 && (
            <Link href={pageHref(list.page - 1)} rel="prev" className="btn-outline">
              {t('prev')}
            </Link>
          )}
          <span className="text-sm text-ink-muted">
            {list.page} / {list.pages}
          </span>
          {list.page < list.pages && (
            <Link href={pageHref(list.page + 1)} rel="next" className="btn-outline">
              {t('next')}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
