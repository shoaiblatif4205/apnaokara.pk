import { BookOpen, Download, Heart, Megaphone, Plus, Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { isFreeNow, type FreeModeSettings } from '@apna-okara/shared';
import { Link, type AppLocale } from '@/i18n/routing';
import { getCategories, getCities } from '@/lib/public';
import { getSetting } from '@/lib/settings';
import { named } from '@/lib/format';
import { Logo } from './Logo';
import { LanguageSwitch } from './LanguageSwitch';

export async function Header({ locale }: { locale: AppLocale }) {
  const tc = await getTranslations({ locale, namespace: 'common' });
  const tb = await getTranslations({ locale, namespace: 'browse' });
  const [cats, cities, offer, free] = await Promise.all([
    getCategories(),
    getCities(),
    getSetting<{ enabled?: boolean; en?: string; ur?: string }>('public.offer_bar'),
    getSetting<FreeModeSettings>('public.free_mode'),
  ]);
  const menuCategories = cats.filter((c) => c.show_on_home).slice(0, 9);
  const freeActive = free ? free.models.some((m) => isFreeNow(free, m, cats.find((c) => c.model === m && (!free.category_slugs?.length || free.category_slugs.includes(c.slug)))?.slug ?? '')) : false;
  const freeText = free ? (locale === 'ur' ? free.banner.ur || free.banner.en : free.banner.en || free.banner.ur) : '';
  const offerText = offer?.enabled ? (locale === 'ur' ? offer.ur || offer.en : offer.en || offer.ur) : '';

  return (
    <header className="bg-white">
      {/* 1. Top bar */}
      <div className="border-b border-line bg-brand text-white">
        <div className="container-site flex min-h-[36px] flex-wrap items-center justify-between gap-2 text-xs">
          <p>{tc('tagline')}</p>
          <nav className="flex items-center gap-4" aria-label="Top">
            <Link href="/download" className="inline-flex items-center gap-1 hover:underline">
              <Download size={14} aria-hidden="true" />
              {tc('downloadApp')}
            </Link>
            <Link href="/advertise" className="inline-flex items-center gap-1 hover:underline">
              <Megaphone size={14} aria-hidden="true" />
              {tc('advertise')}
            </Link>
            <Link href="/blog" className="inline-flex items-center gap-1 hover:underline">
              <BookOpen size={14} aria-hidden="true" />
              {tc('blog')}
            </Link>
            <Link href="/faq" className="hover:underline">
              {tc('help')}
            </Link>
          </nav>
        </div>
      </div>

      {/* 2. Main header */}
      <div className="border-b border-line">
        <div className="container-site flex flex-wrap items-center gap-3 py-3">
          <Link href="/" aria-label={tc('siteName')} className="shrink-0">
            <Logo locale={locale} />
          </Link>

          <form
            action={`/${locale}/search`}
            className="order-last flex w-full items-stretch overflow-hidden rounded-lg border-2 border-brand md:order-none md:w-auto md:flex-1"
            role="search"
          >
            <label htmlFor="header-city" className="sr-only">
              {tc('allCities')}
            </label>
            <select id="header-city" name="city" className="max-w-[40%] border-e border-line bg-page px-2 text-sm text-ink" defaultValue="">
              <option value="">{tc('allCities')}</option>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {named(c, locale)}
                </option>
              ))}
            </select>
            <label htmlFor="header-q" className="sr-only">
              {tc('search')}
            </label>
            <input id="header-q" name="q" type="search" placeholder={tc('searchPlaceholder')} className="min-h-[44px] min-w-0 flex-1 px-3 text-sm outline-none" />
            <button type="submit" className="bg-brand px-4 text-white hover:bg-brand-dark" aria-label={tc('search')}>
              <Search size={20} aria-hidden="true" />
            </button>
          </form>

          <div className="ms-auto flex items-center gap-1 md:ms-0">
            <LanguageSwitch locale={locale} label={tc('language')} />
            <Link href="/saved" className="inline-flex min-h-[44px] items-center px-2 text-ink-muted hover:text-brand" aria-label={tb('favourites')}>
              <Heart size={20} aria-hidden="true" />
            </Link>
            <Link href="/my-ad" className="hidden min-h-[44px] items-center px-2 text-sm font-medium text-ink-muted hover:text-brand sm:inline-flex">
              {tc('myAds')}
            </Link>
            <Link href="/post-ad" className="btn-accent">
              <Plus size={18} aria-hidden="true" />
              {tc('postAd')}
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Category menu bar */}
      <nav className="border-b border-line bg-white" aria-label={tc('allCategories')}>
        <div className="container-site flex items-center gap-1 overflow-x-auto py-1 text-sm">
          <Link href="/categories" className="shrink-0 rounded-md px-3 py-2 font-semibold text-brand hover:bg-brand-light">
            {tc('allCategories')}
          </Link>
          {menuCategories.map((c) => (
            <Link key={c.slug} href={`/${c.slug}`} className="shrink-0 rounded-md px-3 py-2 text-ink-muted hover:bg-page hover:text-brand">
              {named(c, locale)}
            </Link>
          ))}
          <Link href="/rishta" className="shrink-0 rounded-md px-3 py-2 font-semibold text-pink-700 hover:bg-pink-50">
            {tc('rishta')}
          </Link>
        </div>
      </nav>

      {/* 4. Offer bar / Free listings banner (both set by admin) */}
      {(freeActive && freeText) || offerText ? (
        <div className="bg-amber-100 text-amber-900">
          <div className="container-site flex flex-wrap justify-center gap-x-6 py-2 text-center text-sm font-semibold">
            {freeActive && freeText && (
              <Link href="/post-ad" className="hover:underline">
                {freeText}
              </Link>
            )}
            {offerText && <span>{offerText}</span>}
          </div>
        </div>
      ) : null}
    </header>
  );
}
