import { BookOpen } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import type { PostCard } from '@/lib/blog';
import { named } from '@/lib/format';

export function formatPostDate(iso: string, locale: 'en' | 'ur') {
  return new Date(iso).toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function BlogCard({ post, locale }: { post: PostCard; locale: 'en' | 'ur' }) {
  const t = await getTranslations({ locale, namespace: 'blog' });
  return (
    <article className="card group flex flex-col overflow-hidden" lang={post.locale} dir={post.locale === 'ur' ? 'rtl' : 'ltr'}>
      <Link href={`/blog/${post.slug}`} className="block aspect-[16/9] bg-brand-light" tabIndex={-1} aria-hidden="true">
        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-brand">
            <BookOpen size={40} />
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {post.category && (
          <Link href={`/blog/category/${post.category.slug}`} className="text-xs font-semibold text-brand hover:underline">
            {named(post.category, locale)}
          </Link>
        )}
        <h3 className={`mt-1 text-lg font-bold ${post.locale === 'ur' ? 'leading-[1.9]' : 'leading-snug'}`}>
          <Link href={`/blog/${post.slug}`} className="hover:text-brand">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{post.excerpt}</p>}
        <p className="mt-auto pt-3 text-xs text-ink-muted">
          <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt, locale)}</time> · {t('minRead', { n: post.readingMinutes })}
        </p>
      </div>
    </article>
  );
}
