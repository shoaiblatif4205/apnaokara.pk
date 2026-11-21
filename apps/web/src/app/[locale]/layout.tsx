import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, Noto_Nastaliq_Urdu } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { brand, dir } from '@apna-okara/shared';
import { routing, type AppLocale } from '@/i18n/routing';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getSetting } from '@/lib/settings';
import { getSeo, ld, SITE_URL } from '@/lib/seo';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const urdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-urdu',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://apnaokara.pk';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = (routing.locales.includes(params.locale as AppLocale) ? params.locale : 'en') as AppLocale;
  const title = `${brand.name[locale]}: ${brand.tagline[locale]}`;
  const seo = await getSeo();
  const other: Record<string, string> = {};
  if (seo.bing_verification) other['msvalidate.01'] = seo.bing_verification;
  return {
    applicationName: brand.name[locale],
    verification: { google: seo.gsc_verification || undefined, other },
    manifest: '/manifest.webmanifest',
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s | ${brand.name[locale]}` },
    description: brand.tagline[locale],
    openGraph: {
      type: 'website',
      siteName: brand.name[locale],
      title,
      description: brand.tagline[locale],
      locale: locale === 'ur' ? 'ur_PK' : 'en_PK',
      url: `/${locale}`,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: brand.name.en }],
    },
    twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) notFound();
  setRequestLocale(locale);
  const [messages, seo, contact, social] = await Promise.all([
    getMessages(),
    getSeo(),
    getSetting<{ email: string | null; phone: string | null; address: string | null; whatsapp: string | null }>('public.contact'),
    getSetting<Record<string, string | null>>('public.social'),
  ]);

  // Same name, areas and contact everywhere: helps Google and AI tools understand who we are (GEO).
  const sameAs = Object.values(social ?? {}).filter((v): v is string => !!v && /^https:\/\//.test(v));
  const siteLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: brand.name.en,
        alternateName: [brand.name.ur, 'ApnaOkara', 'apnaokara.pk'],
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
        founder: [{ '@type': 'Person', name: 'Shagufta Latif' }],
        description: 'Local online marketplace for Okara, Sahiwal and Pakpattan districts, Punjab, Pakistan: buy and sell, vehicles, property, jobs, service providers, local businesses and rishta.',
        areaServed: ['Okara District', 'Sahiwal District', 'Pakpattan District'].map((name) => ({ '@type': 'AdministrativeArea', name, containedInPlace: { '@type': 'State', name: 'Punjab, Pakistan' } })),
        ...(contact?.email ? { email: contact.email } : {}),
        ...(contact?.phone ? { telephone: contact.phone } : {}),
        ...(contact?.address ? { address: { '@type': 'PostalAddress', streetAddress: contact.address, addressLocality: 'Okara', addressRegion: 'Punjab', addressCountry: 'PK' } } : {}),
        ...(sameAs.length ? { sameAs } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: brand.name.en,
        alternateName: brand.name.ur,
        url: SITE_URL,
        inLanguage: ['en', 'ur'],
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/${locale}/search?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
  const ga = seo.ga4_id && /^G-[A-Z0-9]{4,16}$/.test(seo.ga4_id) && process.env.NODE_ENV === 'production' ? seo.ga4_id : null;

  return (
    <html lang={locale} dir={dir(locale as AppLocale)} className={`${inter.variable} ${urdu.variable}`}>
      <body className="flex min-h-screen flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(siteLd) }} />
        {ga && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}',{anonymize_ip:true});`,
              }}
            />
          </>
        )}
        <NextIntlClientProvider messages={messages}>
          <Header locale={locale as AppLocale} />
          <main className="flex-1">{children}</main>
          <Footer locale={locale as AppLocale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
