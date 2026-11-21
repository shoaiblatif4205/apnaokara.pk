import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

// URLs: /en/... and /ur/...  (separate URLs per language for SEO + hreflang)
export const routing = defineRouting({
  locales: ['en', 'ur'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export type AppLocale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
