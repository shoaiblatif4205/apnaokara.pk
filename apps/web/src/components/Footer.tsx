import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link, type AppLocale } from '@/i18n/routing';
import { getCategories, getCities } from '@/lib/public';
import { getSetting } from '@/lib/settings';
import { named } from '@/lib/format';
import { Logo } from './Logo';

// Footer links follow the admin's Categories (shown on home) and Locations.

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-b border-white/15 py-3 md:border-none md:py-0" open>
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between font-semibold text-white md:pointer-events-none md:min-h-0 md:pb-3">
        {title}
        <span className="text-white/70 md:hidden" aria-hidden="true">
          +
        </span>
      </summary>
      <ul className="space-y-2 pt-2 text-sm text-white/85 md:pt-0">{children}</ul>
    </details>
  );
}

function FLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="hover:text-white hover:underline">
        {children}
      </Link>
    </li>
  );
}

export async function Footer({ locale }: { locale: AppLocale }) {
  const tf = await getTranslations({ locale, namespace: 'footer' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const [cats, cities, social, apps] = await Promise.all([
    getCategories(),
    getCities(),
    getSetting<Record<string, string | null>>('public.social'),
    getSetting<{ play_store?: string | null; app_store?: string | null }>('public.app_links'),
  ]);
  // Store badges only once the app is published (Admin → Site settings → App links)
  const storeLinks = [
    ['Google Play', apps?.play_store],
    ['App Store', apps?.app_store],
  ].filter(([, href]) => href) as [string, string][];
  const services = cats.find((c) => c.slug === 'services');
  const business = cats.find((c) => c.slug === 'business');
  const popular = cats.filter((c) => c.show_on_home && c.model !== 'services' && c.model !== 'business').slice(0, 8);
  const socialLinks = [
    ['Facebook', social?.facebook],
    ['WhatsApp', social?.whatsapp_channel || social?.whatsapp_group],
    ['Instagram', social?.instagram],
    ['YouTube', social?.youtube],
  ].filter(([, href]) => href) as [string, string][];
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-[#14532D] text-white">
      <div className="container-site grid gap-2 py-10 md:grid-cols-5 md:gap-8">
        {/* 1. About */}
        <div className="pb-4 md:pb-0">
          <div className="inline-block rounded-lg bg-white px-3 py-2">
            <Logo locale={locale} />
          </div>
          <p className="mt-4 text-sm text-white/85">{tf('about')}</p>
          {socialLinks.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-3 text-sm">
              {socialLinks.map(([name, href]) => (
                <li key={name}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {storeLinks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {storeLinks.map(([name, href]) => (
                <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="rounded-md border border-white/30 px-3 py-2 hover:bg-white/10">
                  {name}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* 2. Popular categories */}
        <Column title={tf('popularCategories')}>
          {popular.map((c) => (
            <FLink key={c.slug} href={`/${c.slug}`}>
              {named(c, locale)}
            </FLink>
          ))}
        </Column>

        {/* 3. Services and business */}
        <Column title={tf('servicesBusiness')}>
          {services?.subs.slice(0, 5).map((s) => (
            <FLink key={s.slug} href={`/services/${s.slug}`}>
              {named(s, locale)}
            </FLink>
          ))}
          {business && <FLink href="/business">{named(business, locale)}</FLink>}
          <FLink href="/post-ad?model=services">{tf('listService')}</FLink>
          <FLink href="/post-ad?model=business">{tf('listBusiness')}</FLink>
        </Column>

        {/* 4. Cities */}
        <Column title={tf('cities')}>
          {cities.slice(0, 11).map((c) => (
            <FLink key={c.slug} href={`/city/${c.slug}`}>
              {named(c, locale)}
            </FLink>
          ))}
        </Column>

        {/* 5. Company and help */}
        <Column title={tf('companyHelp')}>
          <FLink href="/about">{tf('aboutUs')}</FLink>
          <FLink href="/contact">{tf('contact')}</FLink>
          <FLink href="/how-it-works">{tf('howItWorks')}</FLink>
          <FLink href="/my-ad">{tc('myAds')}</FLink>
          <FLink href="/pricing">{tf('pricing')}</FLink>
          <FLink href="/advertise">{tc('advertise')}</FLink>
          <FLink href="/blog">{tf('blog')}</FLink>
          <FLink href="/faq">{tf('faq')}</FLink>
          <FLink href="/safety">{tf('safety')}</FLink>
          <FLink href="/posting-rules">{tf('postingRules')}</FLink>
        </Column>
      </div>

      {/* Bottom strip */}
      <div className="border-t border-white/15">
        <div className="container-site flex flex-wrap items-center justify-between gap-3 py-4 text-xs text-white/80">
          <p>
            © {year} {tc('siteName')} · apnaokara.pk · {tf('rights')}
          </p>
          <nav className="flex flex-wrap gap-3" aria-label="Legal">
            <Link href="/terms" className="hover:text-white">{tf('terms')}</Link>
            <Link href="/privacy" className="hover:text-white">{tf('privacy')}</Link>
            <Link href="/refund-policy" className="hover:text-white">{tf('refund')}</Link>
            <Link href="/disclaimer" className="hover:text-white">{tf('disclaimer')}</Link>
          </nav>
          <p>
            {tf('payWith')}: JazzCash · Easypaisa · Bank
          </p>
        </div>
        <p className="container-site border-t border-white/10 py-3 text-center text-xs text-white/70">
          {tf('madeBy')}{' '}
          <a href="https://shoaiblatif.tech" target="_blank" rel="noopener" className="font-semibold text-white hover:underline">
            {locale === 'ur' ? 'شعیب لطیف' : 'Shoaib Latif'}
          </a>{' '}
          · <span dir="ltr">shoaiblatif.tech</span>
        </p>
      </div>
    </footer>
  );
}
