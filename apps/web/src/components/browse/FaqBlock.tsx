import { getTranslations } from 'next-intl/server';
import type { Faq } from '@/lib/aeo';
import { ld } from '@/lib/seo';

/** Questions and answers at the end of listing pages, with FAQPage structured data. */
export async function FaqBlock({ faqs, locale, title }: { faqs: Faq[]; locale: 'en' | 'ur'; title?: string }) {
  if (!faqs.length) return null;
  const t = await getTranslations({ locale, namespace: 'blog' });
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  return (
    <section className="container-site mt-10" aria-labelledby="page-faq">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(data) }} />
      <h2 id="page-faq" className="section-title">
        {title ?? t('faqTitle')}
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {faqs.map((f) => (
          <div key={f.q} className="card p-4">
            <h3 className="font-semibold">{f.q}</h3>
            <p className="mt-2 text-sm text-ink-muted">{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
