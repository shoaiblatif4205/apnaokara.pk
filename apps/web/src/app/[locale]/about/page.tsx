import { Mail, MessageCircle, Phone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { getSetting } from '@/lib/settings';
import { ld, SITE_URL } from '@/lib/seo';
import { pageMetadata, StaticPage } from '@/components/pages/StaticPage';

export const generateMetadata = pageMetadata('about');

type Contact = { email: string | null; phone: string | null; whatsapp: string | null };

export default async function AboutPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'pages' });
  const c = await getSetting<Contact>('public.contact');
  const numbers = [...new Set([c?.phone, c?.whatsapp].filter(Boolean) as string[])];
  const wa = (n: string) => `https://wa.me/${n.replace(/\D/g, '').replace(/^0/, '92')}`;

  // AboutPage + founders as structured data (who is behind the site: trust for Google and AI tools)
  const data = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    url: `${SITE_URL}/${locale}/about`,
    about: {
      '@id': `${SITE_URL}/#organization`,
      founder: [{ '@type': 'Person', name: 'Shagufta Latif' }],
    },
  };

  const founders = (
    <section className="card mt-4 p-5 md:p-8" aria-labelledby="founders">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(data) }} />
      <h2 id="founders" className="text-xl font-bold">{t('foundersTitle')}</h2>
      <figure className="mt-5 flex flex-col items-center text-center">
        <span aria-hidden="true" className="flex h-40 w-40 items-center justify-center rounded-full bg-brand text-5xl font-extrabold text-white ring-4 ring-brand-light">
          {locale === 'ur' ? 'ش ل' : 'SL'}
        </span>
        <figcaption className="mt-3">
          <span className="block text-lg font-bold">{t('shagufta')}</span>
          <span className="block text-sm text-ink-muted">{t('coFounder')}</span>
        </figcaption>
      </figure>
      {numbers.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {numbers.map((n) => (
            <span key={n} className="flex gap-2">
              <a href={`tel:${n.replace(/\s/g, '')}`} className="btn-outline" dir="ltr">
                <Phone size={16} aria-hidden="true" /> {n}
              </a>
              <a href={wa(n)} target="_blank" rel="noopener noreferrer" className="btn bg-[#1FAF5A] text-white hover:bg-[#178A47]" aria-label={`${t('whatsapp')} ${n}`}>
                <MessageCircle size={16} aria-hidden="true" /> {t('whatsapp')}
              </a>
            </span>
          ))}
          {c?.email && (
            <a href={`mailto:${c.email}`} className="btn-outline" dir="ltr">
              <Mail size={16} aria-hidden="true" /> {c.email}
            </a>
          )}
        </div>
      )}
    </section>
  );

  return <StaticPage slug="about" locale={locale} after={founders} />;
}
