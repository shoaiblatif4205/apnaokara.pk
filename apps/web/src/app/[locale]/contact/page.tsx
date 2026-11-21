import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { getSetting } from '@/lib/settings';
import { pageMetadata, StaticPage } from '@/components/pages/StaticPage';
import { ContactForm } from '@/components/pages/ContactForm';

export const generateMetadata = pageMetadata('contact');

type Contact = { email: string | null; phone: string | null; address: string | null; whatsapp: string | null };

export default async function ContactPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'pages' });
  const c = await getSetting<Contact>('public.contact');
  // Every number gets Call + WhatsApp (both numbers may be on WhatsApp)
  const numbers = [...new Set([c?.phone, c?.whatsapp].filter(Boolean) as string[])];
  const wa = (n: string) => `https://wa.me/${n.replace(/D/g, '').replace(/^0/, '92')}`;
  const items = [
    c?.email && { icon: Mail, label: t('email'), value: c.email, href: `mailto:${c.email}` },
    c?.address && { icon: MapPin, label: t('address'), value: c.address, href: null },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href: string | null }[];

  return (
    <StaticPage
      slug="contact"
      locale={locale}
      after={
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_2fr]">
          <section className="card p-5" aria-label={t('contactUs')}>
            {items.length || numbers.length ? (
              <ul className="space-y-4">
                {numbers.map((n) => (
                  <li key={n} className="flex items-start gap-3">
                    <Phone size={20} className="mt-1 shrink-0 text-brand" aria-hidden="true" />
                    <span>
                      <span className="block text-xs font-semibold text-ink-muted">{t('callOrWhatsapp')}</span>
                      <span className="block font-semibold" dir="ltr">{n}</span>
                      <span className="mt-2 flex flex-wrap gap-2">
                        <a href={`tel:${n.replace(/s/g, '')}`} className="btn-sm border border-line bg-white hover:border-brand">
                          <Phone size={14} aria-hidden="true" /> {t('phone')}
                        </a>
                        <a href={wa(n)} target="_blank" rel="noopener noreferrer" className="btn-sm bg-[#1FAF5A] text-white hover:bg-[#178A47]">
                          <MessageCircle size={14} aria-hidden="true" /> {t('whatsapp')}
                        </a>
                      </span>
                    </span>
                  </li>
                ))}
                {items.map(({ icon: Icon, label, value, href }) => (
                  <li key={label} className="flex items-start gap-3">
                    <Icon size={20} className="mt-1 shrink-0 text-brand" aria-hidden="true" />
                    <span>
                      <span className="block text-xs font-semibold text-ink-muted">{label}</span>
                      {href ? (
                        <a href={href} className="font-semibold hover:text-brand" dir="ltr" target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                          {value}
                        </a>
                      ) : (
                        <span className="font-semibold">{value}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">{t('detailsSoon')}</p>
            )}
          </section>
          <section className="card p-5" aria-labelledby="form-title">
            <h2 id="form-title" className="mb-4 text-lg font-bold">
              {t('formTitle')}
            </h2>
            <ContactForm />
          </section>
        </div>
      }
    />
  );
}
