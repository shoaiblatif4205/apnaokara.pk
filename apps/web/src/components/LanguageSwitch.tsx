'use client';

import { Languages } from 'lucide-react';
import { Link, usePathname, type AppLocale } from '@/i18n/routing';

// Switches between /en/... and /ur/... on the same page.
export function LanguageSwitch({ locale, label }: { locale: AppLocale; label: string }) {
  const pathname = usePathname();
  const other: AppLocale = locale === 'en' ? 'ur' : 'en';
  return (
    <Link
      href={pathname}
      locale={other}
      className="inline-flex min-h-[44px] items-center gap-1 px-2 text-sm font-medium text-ink-muted hover:text-brand"
      hrefLang={other}
    >
      <Languages size={16} aria-hidden="true" />
      <span className={other === 'ur' ? 'font-urdu' : ''}>{label}</span>
    </Link>
  );
}
