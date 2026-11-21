import type { AppLocale } from '@/i18n/routing';
import { getPage } from '@/lib/pages';
import { faqFromMarkdown } from '@/lib/markdown';
import { pageMetadata, StaticPage } from '@/components/pages/StaticPage';

export const generateMetadata = pageMetadata('faq');

// Questions are "### Question" headings in the page text. They also become
// FAQPage structured data, which helps Google and AI answers (AEO).
export default async function FaqPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  const page = await getPage('faq', locale);
  const faq = faqFromMarkdown(page.body);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  return (
    <StaticPage
      slug="faq"
      locale={locale}
      showToc={false}
      after={faq.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
    />
  );
}
