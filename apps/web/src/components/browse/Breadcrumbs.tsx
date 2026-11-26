import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { ld, SITE_URL } from '@/lib/seo';

const site = SITE_URL;

/** Breadcrumb trail + BreadcrumbList structured data. Last item is the current page. */
export function Breadcrumbs({ items, locale }: { items: { label: string; href: string }[]; locale: 'en' | 'ur' }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      item: `${site}/${locale}${it.href === '/' ? '' : it.href}`,
    })),
  };
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(jsonLd) }} />
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={it.href} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} aria-hidden="true" className="rtl:rotate-180" />}
            {i === items.length - 1 ? (
              <span aria-current="page" className="font-semibold text-ink">
                {it.label}
              </span>
            ) : (
              <Link href={it.href} className="hover:text-brand hover:underline">
                {it.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
