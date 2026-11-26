import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { BadgeCheck, BookOpen, Heart, Languages, MapPin, MessageCircle, Smartphone, Star, Users } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, type AppLocale } from '@/i18n/routing';
import { CategoryIcon } from '@/components/CategoryIcon';
import { AdCard, AdGrid } from '@/components/browse/AdCard';
import { BannerBox } from '@/components/browse/Banner';
import { HeroSlider } from '@/components/browse/HeroSlider';
import {
  featuredAds,
  getBanners,
  getCategories,
  getCities,
  getHomeSections,
  latestAds,
  topProviders,
  type BannerRow,
} from '@/lib/public';
import { getSetting } from '@/lib/settings';
import { named } from '@/lib/format';
import { previewProfiles } from '@/lib/rishta/profiles';
import { RishtaPreview } from '@/components/rishta/RishtaPreview';
import { latestPosts } from '@/lib/blog';
import { BlogCard } from '@/components/blog/BlogCard';
import { ld as safeLd } from '@/lib/seo';

// Home page. Sections, their order and on/off come from admin (Homepage Manager).

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  return { alternates: { canonical: `/${params.locale}`, languages: { en: '/en', ur: '/ur', 'x-default': '/en' } } };
}

export default async function HomePage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const th = await getTranslations({ locale, namespace: 'home' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const t = await getTranslations({ locale, namespace: 'browse' });
  const tr = await getTranslations({ locale, namespace: 'rishta' });

  const [sections, cats, cities, banners, featured, fresh, services, businesses, jobs, social, apps, rishtaPreview, posts] = await Promise.all([
    getHomeSections(),
    getCategories(),
    getCities(),
    getBanners(['hero_slider', 'hero_side', 'home_strip', 'in_feed']),
    featuredAds(8),
    latestAds({ limit: 12, models: ['buy_sell', 'vehicles', 'property'] }),
    topProviders('services', 6),
    topProviders('business', 4),
    latestAds({ limit: 6, model: 'jobs' }),
    getSetting<Record<string, string | null>>('public.social'),
    getSetting<{ play_store?: string | null; app_store?: string | null }>('public.app_links'),
    previewProfiles(4),
    latestPosts(locale, 3),
  ]);
  const enabled = sections.filter((s) => s.is_enabled);
  const sponsored = tc('sponsored');
  const by = (p: string) => banners.filter((b) => b.placement === p);
  const sectionTitle = (key: string, fallback: string) => {
    const s = sections.find((x) => x.key === key);
    return (locale === 'ur' ? s?.title_ur : s?.title_en) || fallback;
  };

  const Header = ({ title, href, id }: { title: string; href?: string; id: string }) => (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="section-title">
        {title}
      </h2>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-semibold text-brand hover:underline">
          {tc('viewAll')}
        </Link>
      )}
    </div>
  );

  // ----- hero -----
  const ourSlide = (
    <div className="flex h-full min-h-[260px] flex-col justify-center rounded-2xl bg-brand p-6 pb-14 text-white md:p-10 md:pb-14">
      <h1 className="text-3xl font-extrabold md:text-4xl">{th('heroTitle')}</h1>
      <p className="mt-3 max-w-xl text-white/90 md:text-lg">{th('heroText')}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/post-ad" className="btn bg-white text-brand hover:bg-brand-light">
          {th('heroCta')}
        </Link>
        <Link href="/search" className="btn border border-white/60 text-white hover:bg-white/10">
          {th('heroSecondary')}
        </Link>
      </div>
    </div>
  );
  const slideFor = (b: BannerRow) => <BannerBox banner={b} locale={locale} sponsoredLabel={sponsored} className="min-h-[260px]" />;
  const side = by('hero_side').slice(0, 2);
  const strip = by('home_strip')[0];
  const feed = by('in_feed')[0];

  const render: Record<string, () => ReactNode> = {
    hero: () => (
      // No empty "your banner here" boxes: the hero is full width until a brand books a place
      <section className={`container-site mt-4 grid gap-3 ${side.length ? 'lg:grid-cols-3' : ''}`} aria-label={th('heroTitle')}>
        <div className={side.length ? 'lg:col-span-2' : ''}>
          <HeroSlider slides={[ourSlide, ...by('hero_slider').map(slideFor)]} labels={{ prev: t('prev'), next: t('next'), slide: th('heroTitle') }} />
        </div>
        {side.length > 0 && (
          <div className={`grid gap-3 ${side.length > 1 ? 'grid-cols-2 lg:grid-cols-1' : ''}`}>
            {side.map((b) => (
              <BannerBox key={b.id} banner={b} locale={locale} sponsoredLabel={sponsored} />
            ))}
          </div>
        )}
      </section>
    ),

    trust_points: () => (
      <section className="container-site mt-4">
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            [Users, th('trustLocal')],
            [BadgeCheck, th('trustVerified')],
            [MessageCircle, th('trustWhatsapp')],
            [Languages, th('trustBilingual')],
          ].map(([Icon, text]) => {
            const I = Icon as typeof Users;
            return (
              <li key={text as string} className="card flex items-center gap-2 p-3 text-sm font-medium">
                <I size={20} className="shrink-0 text-brand" aria-hidden="true" />
                {text as string}
              </li>
            );
          })}
        </ul>
      </section>
    ),

    categories: () => (
      <section className="container-site mt-10" aria-labelledby="h-cats">
        <Header id="h-cats" title={sectionTitle('categories', th('categoriesTitle'))} href="/categories" />
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-7">
          {cats
            .filter((c) => c.show_on_home)
            .map((c) => (
              <li key={c.slug}>
                <Link href={`/${c.slug}`} className="card flex h-full flex-col items-center gap-2 p-3 text-center hover:border-brand hover:shadow-sm">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
                    <CategoryIcon icon={(c.icon ?? 'other') as never} size={28} />
                  </span>
                  <span className="text-sm font-semibold leading-tight">{named(c, locale)}</span>
                  {locale === 'en' && <span className="font-urdu text-xs leading-[1.8] text-ink-muted">{c.name_ur}</span>}
                  <span className="text-[11px] text-ink-muted">{t('adsCount', { count: c.live })}</span>
                </Link>
              </li>
            ))}
        </ul>
      </section>
    ),

    featured: () => (
      <section className="container-site mt-10" aria-labelledby="h-feat">
        <Header id="h-feat" title={sectionTitle('featured', th('featuredTitle'))} href="/search?featured=1" />
        {featured.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {featured.map((a) => (
              <li key={a.id}>
                <AdCard ad={a} locale={locale} large />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Star size={28} aria-hidden="true" className="mt-0.5 shrink-0 fill-amber-400 text-amber-500" />
            <div>
              <p className="font-bold text-amber-900">{th('featureCtaTitle')}</p>
              <p className="text-sm text-amber-900/80">{th('featureCtaText')}</p>
            </div>
          </div>
          <Link href="/post-ad" className="btn bg-amber-500 font-bold text-white hover:bg-amber-600">
            {th('featureCtaButton')}
          </Link>
        </div>
      </section>
    ),

    wide_banner: () =>
      strip ? (
        <section className="container-site mt-10 h-[120px] md:h-[160px]">
          <BannerBox banner={strip} locale={locale} sponsoredLabel={sponsored} />
        </section>
      ) : null,

    fresh_ads: () => (
      <section className="container-site mt-10" aria-labelledby="h-fresh">
        <Header id="h-fresh" title={sectionTitle('fresh_ads', th('freshTitle'))} href="/search" />
        <div className="mt-4">
          {fresh.length ? (
            <AdGrid
              ads={fresh}
              locale={locale}
              sponsor={feed ? <BannerBox banner={feed} locale={locale} sponsoredLabel={sponsored} className="aspect-[3/4]" /> : undefined}
            />
          ) : (
            <div className="card p-8 text-center text-ink-muted">{th('emptyAds')}</div>
          )}
        </div>
      </section>
    ),

    seasonal: () => <Seasonal key="seasonal" locale={locale} config={sections.find((s) => s.key === 'seasonal')?.config} title={sectionTitle('seasonal', t('seasonal'))} />,

    services: () => (
      <section className="container-site mt-10" aria-labelledby="h-serv">
        <Header id="h-serv" title={sectionTitle('services', th('servicesTitle'))} href="/services" />
        {services.length ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {services.map((a) => (
              <li key={a.id}>
                <AdCard ad={a} locale={locale} />
              </li>
            ))}
          </ul>
        ) : null}
        <Link href="/post-ad?model=services" className="btn-outline mt-4">
          {t('listService')}
        </Link>
      </section>
    ),

    rishta: () => (
      <section className="container-site mt-10" aria-labelledby="h-rishta">
        <div className="rounded-2xl border border-pink-200 bg-[#FDF2F8] p-5 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h2 id="h-rishta" className="flex items-center gap-2 text-xl font-bold text-pink-900 md:text-2xl">
                <Heart size={24} aria-hidden="true" className="text-pink-700" />
                {sectionTitle('rishta', tr('homeTitle'))}
              </h2>
              <p className="mt-2 text-pink-900/80">{tr('homeText')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/rishta/signup" className="btn bg-pink-700 text-white hover:bg-pink-800">
                {tr('signup')}
              </Link>
              <Link href="/rishta" className="btn border border-pink-700 bg-white text-pink-800">
                {tr('seeAll')}
              </Link>
            </div>
          </div>
          {rishtaPreview.profiles.length > 0 ? (
            <div className="mt-5">
              <RishtaPreview profiles={rishtaPreview.profiles.slice(0, 4)} locale={locale} loggedIn={false} total={rishtaPreview.total} />
            </div>
          ) : (
            <>
              <ol className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  { Icon: Users, text: tr('homeStep1') },
                  { Icon: BadgeCheck, text: tr('homeStep2') },
                  { Icon: Heart, text: tr('homeStep3') },
                ].map(({ Icon, text }, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-700">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="text-pink-950">
                      <b className="text-pink-700">{i + 1}.</b> {text}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm font-semibold text-pink-800">{tr('homeEmpty')}</p>
            </>
          )}
        </div>
      </section>
    ),

    city_tabs: () => <CityPopular key="city_tabs" locale={locale} citySlug={cities[0]?.slug} cityName={cities[0] ? named(cities[0], locale) : ''} />,

    jobs: () =>
      jobs.length ? (
        <section className="container-site mt-10" aria-labelledby="h-jobs">
          <Header id="h-jobs" title={sectionTitle('jobs', t('latestJobs'))} href="/jobs" />
          <ul className="card mt-4 divide-y divide-line">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link href={`/ad/${j.slug}-${j.reference}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-page">
                  <span className="font-semibold">{j.title}</span>
                  <span className="flex items-center gap-3 text-sm text-ink-muted">
                    {j.fields.salary_from ? <span>Rs {Number(j.fields.salary_from).toLocaleString('en-PK')}+</span> : null}
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={14} aria-hidden="true" /> {named(j.city, locale)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null,

    businesses: () =>
      businesses.length ? (
        <section className="container-site mt-10" aria-labelledby="h-biz">
          <Header id="h-biz" title={sectionTitle('businesses', t('localBusinesses'))} href="/business" />
          <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {businesses.map((a) => (
              <li key={a.id}>
                <AdCard ad={a} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      ) : null,

    how_it_works: () => (
      <section className="container-site mt-10" aria-labelledby="h-how">
        <h2 id="h-how" className="section-title">
          {sectionTitle('how_it_works', th('howTitle'))}
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {[th('howStep1'), th('howStep2'), th('howStep3'), th('howStep4')].map((s, i) => (
            <li key={s} className="card flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-bold text-white">{i + 1}</span>
              <span className="font-semibold">{s}</span>
            </li>
          ))}
        </ol>
      </section>
    ),

    cities: () => (
      <section className="container-site mt-10" aria-labelledby="h-cities">
        <h2 id="h-cities" className="section-title">
          {sectionTitle('cities', th('citiesTitle'))}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {cities.map((c) => (
            <li key={c.slug}>
              <Link href={`/city/${c.slug}`} className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-line bg-white px-4 text-sm hover:border-brand hover:text-brand">
                <MapPin size={16} aria-hidden="true" />
                {named(c, locale)}
                <span className="text-xs text-ink-muted">({c.live})</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ),

    brands: () => (
      <section className="container-site mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-accent-light p-6 text-orange-900">
          <div>
            <h2 className="text-xl font-bold">{th('brandsTitle')}</h2>
            <p className="mt-1">{th('brandsText')}</p>
          </div>
          <Link href="/advertise" className="btn-accent">
            {th('brandsCta')}
          </Link>
        </div>
      </section>
    ),

    // Each card shows only when it has a real link (Admin → Site settings: Social links / App links)
    community_app: () => {
      const group = social?.whatsapp_group || social?.whatsapp_channel;
      const store = apps?.play_store || apps?.app_store;
      if (!group && !store) return null;
      return (
        <section className={`container-site mt-10 grid gap-3 ${group && store ? 'md:grid-cols-2' : ''}`}>
          {group && (
            <div className="card flex flex-col gap-3 p-6">
              <MessageCircle size={28} className="text-brand" aria-hidden="true" />
              <h2 className="text-lg font-bold">{th('communityTitle')}</h2>
              <p className="text-ink-muted">{th('communityText')}</p>
              <a href={group} target="_blank" rel="noopener noreferrer" className="btn-primary self-start">
                {th('communityCta')}
              </a>
            </div>
          )}
          {store && (
            <div className="card flex flex-col gap-3 p-6">
              <Smartphone size={28} className="text-accent" aria-hidden="true" />
              <h2 className="text-lg font-bold">{th('appTitle')}</h2>
              <p className="text-ink-muted">{th('appText')}</p>
              <Link href="/download" className="btn-outline self-start">
                {tc('downloadApp')}
              </Link>
            </div>
          )}
        </section>
      );
    },

    blog: () => (
      <section className="container-site mt-10" aria-labelledby="h-blog">
        <Header id="h-blog" title={sectionTitle('blog', t('fromBlog'))} href={posts.length ? '/blog' : undefined} />
        {posts.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <BlogCard key={p.id} post={p} locale={locale} />
            ))}
          </div>
        ) : (
          <p className="card mt-4 flex items-center gap-3 p-6 text-ink-muted">
            <BookOpen size={22} aria-hidden="true" className="shrink-0 text-brand" />
            {t('blogSoon')}
          </p>
        )}
      </section>
    ),

    faq: () => {
      const faqs = [1, 2, 3, 4, 5, 6].map((i) => ({ q: t(`faq${i}q` as never), a: t(`faq${i}a` as never) }));
      const ld = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      };
      return (
        <section className="container-site mt-10" aria-labelledby="h-faq">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeLd(ld) }} />
          <h2 id="h-faq" className="section-title">
            {sectionTitle('faq', t('faqTitle'))}
          </h2>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {faqs.map((f) => (
              <details key={f.q} className="card p-4">
                <summary className="cursor-pointer font-semibold">{f.q}</summary>
                <p className="mt-2 text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      );
    },

    seo_text: () => (
      <section className="container-site mt-10">
        <h2 className="text-lg font-bold">{t('seoTitle')}</h2>
        <p className="mt-2 max-w-4xl text-sm text-ink-muted">{t('seoText')}</p>
      </section>
    ),
  };

  // Organization + WebSite structured data are added on every page by the layout.
  return (
    <>
      {enabled.map((s) => {
        const fn = render[s.key];
        return fn ? <div key={s.key}>{fn()}</div> : null;
      })}
    </>
  );
}

async function Seasonal({ locale, config, title }: { locale: 'en' | 'ur'; config?: Record<string, unknown>; title: string }) {
  const slug = typeof config?.category_slug === 'string' ? config.category_slug : null;
  if (!slug) return null;
  const cats = await getCategories();
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return null;
  const { searchAds } = await import('@/lib/public');
  const { ads } = await searchAds({ categorySlug: slug, perPage: 8 });
  if (!ads.length) return null;
  return (
    <section className="container-site mt-10">
      <div className="flex items-center justify-between">
        <h2 className="section-title">{title}</h2>
        <Link href={`/${slug}`} className="text-sm font-semibold text-brand hover:underline">
          {named(cat, locale)}
        </Link>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {ads.map((a) => (
          <li key={a.id}>
            <AdCard ad={a} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}

async function CityPopular({ locale, citySlug, cityName }: { locale: 'en' | 'ur'; citySlug?: string; cityName: string }) {
  if (!citySlug) return null;
  const t = await getTranslations({ locale, namespace: 'browse' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const [vehicles, property, jobs] = await Promise.all([
    latestAds({ limit: 4, model: 'vehicles', citySlug }),
    latestAds({ limit: 4, model: 'property', citySlug }),
    latestAds({ limit: 4, model: 'jobs', citySlug }),
  ]);
  const cols = [
    { title: 'vehicles', ads: vehicles, href: `/vehicles/${citySlug}` },
    { title: 'property-sale', ads: property, href: `/property-sale/${citySlug}` },
    { title: 'jobs', ads: jobs, href: `/jobs/${citySlug}` },
  ].filter((c) => c.ads.length);
  if (!cols.length) return null;
  const cats = await getCategories();
  return (
    <section className="container-site mt-10">
      <h2 className="section-title">{t('popularIn', { city: cityName })}</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-3">
        {cols.map((c) => {
          const cat = cats.find((x) => x.slug === c.title);
          return (
            <div key={c.title}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold">{cat ? named(cat, locale) : c.title}</h3>
                <Link href={c.href} className="text-sm text-brand hover:underline">
                  {tc('viewAll')}
                </Link>
              </div>
              <ul className="grid grid-cols-2 gap-2">
                {c.ads.map((a) => (
                  <li key={a.id}>
                    <AdCard ad={a} locale={locale} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
