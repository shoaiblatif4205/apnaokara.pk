import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Heart, UserRound } from 'lucide-react';
import { Link, type AppLocale } from '@/i18n/routing';
import { getRishtaAccount } from '@/lib/rishta/session';

// Rishta section: its own menu with Login / Sign up. Pages inside are private (noindex) except the landing page.
export default async function RishtaLayout({ children, params: paramsPromise }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const params = await paramsPromise;
  const t = await getTranslations({ locale: params.locale as AppLocale, namespace: 'rishta' });
  const account = await getRishtaAccount();
  const links = account
    ? [
        ['/rishta', t('title')],
        ['/rishta/search', t('search')],
        ['/rishta/interests', t('interests')],
        ['/rishta/me', t('myProfiles')],
      ]
    : [
        ['/rishta', t('title')],
        ['/rishta/rules', t('rules')],
        ['/rishta/success', t('success')],
      ];
  return (
    <div>
      <nav className="border-b border-line bg-[#FDF2F8]" aria-label={t('title')}>
        <div className="container-site flex flex-wrap items-center gap-1 py-2 text-sm">
          <Heart size={18} className="me-1 shrink-0 text-pink-700" aria-hidden="true" />
          <div className="flex flex-1 gap-1 overflow-x-auto">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="shrink-0 rounded-md px-3 py-2 font-medium text-ink hover:bg-white">
                {label}
              </Link>
            ))}
          </div>
          {account ? (
            <Link href="/rishta/me" className="inline-flex min-h-[40px] items-center gap-1 rounded-md px-3 font-semibold text-pink-800 hover:bg-white">
              <UserRound size={16} aria-hidden="true" />
              <span dir="ltr">{account.phone}</span>
            </Link>
          ) : (
            <div className="flex gap-2">
              <Link href="/rishta/login" className="btn-sm border border-pink-700 bg-white text-pink-800">
                {t('login')}
              </Link>
              <Link href="/rishta/signup" className="btn-sm bg-pink-700 text-white hover:bg-pink-800">
                {t('signup')}
              </Link>
            </div>
          )}
        </div>
      </nav>
      {children}
    </div>
  );
}
