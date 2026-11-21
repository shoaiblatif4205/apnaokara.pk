import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCategories, getCities } from '@/lib/public';
import { q } from '@/lib/db';
import { named } from '@/lib/format';
import { fill, getSeo } from '@/lib/seo';
import { categoryStats, type Faq } from '@/lib/aeo';
import { ListingsView, type SP } from '@/components/browse/ListingsView';
import { FaqBlock } from '@/components/browse/FaqBlock';
import type { AppLocale } from '@/i18n/routing';

export async function generateMetadata(props: { params: Promise<{ locale: string; city: string }> }): Promise<Metadata> {
  const params = await props.params;
  const city = (await getCities()).find((c) => c.slug === params.city);
  if (!city) return {};
  const locale = params.locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'browse' });
  const seo = await getSeo();
  const name = named(city, locale);
  const title = fill(seo.templates.city[locale], { city: name });
  const path = `/city/${city.slug}`;
  const description =
    locale === 'ur'
      ? `${name} میں ${city.live} لائیو اشتہار: موبائل، بائیک، گاڑیاں، پراپرٹی، نوکریاں، کاریگر اور مقامی کاروبار۔ اپنا اوکاڑہ پر مفت تلاش کریں۔`
      : `${city.live} live ads in ${name}: mobiles, bikes, cars, property, jobs, service providers and local businesses. Search free on Apna Okara.`;
  return {
    title,
    description: city.live ? description : t('seoText').slice(0, 155),
    alternates: { canonical: `/${locale}${path}`, languages: { en: `/en${path}`, ur: `/ur${path}`, 'x-default': `/en${path}` } },
    robots: city.live === 0 && !seo.index_empty_city_pages ? { index: false, follow: true } : undefined,
  };
}

export default async function CityPage(props: { params: Promise<{ locale: string; city: string }>; searchParams: Promise<SP> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const city = (await getCities()).find((c) => c.slug === params.city);
  if (!city) notFound();
  const t = await getTranslations({ locale, namespace: 'browse' });
  const tf = await getTranslations({ locale, namespace: 'footer' });
  const name = named(city, locale);

  let faqs: Faq[] = [];
  if (!Object.keys(searchParams).length) {
    const [cats, top, services] = await Promise.all([
      getCategories(),
      q<{ slug: string; n: number }>(
        `select c.slug, count(*)::int as n from listings l join categories c on c.id = l.category_id
          where l.city_id = $1 and l.status = 'approved' and (l.expires_at is null or l.expires_at > now())
          group by c.slug order by n desc limit 3`,
        [city.id],
      ),
      categoryStats({ categorySlug: 'services', citySlug: city.slug }),
    ]);
    const topNames = top.map((x) => cats.find((c) => c.slug === x.slug)).filter(Boolean).map((c) => named(c!, locale));
    const ur = locale === 'ur';
    faqs = [
      {
        q: ur ? `${name} میں کیا خریدا اور بیچا جا سکتا ہے؟` : `What can I buy and sell in ${name}?`,
        a: ur
          ? `اپنا اوکاڑہ پر ${name} میں اس وقت ${city.live} لائیو اشتہار ہیں${topNames.length ? `، سب سے زیادہ ${topNames.join('، ')} میں` : ''}۔ موبائل، بائیک، گاڑیاں، پراپرٹی، نوکریاں اور کاریگر سب ایک جگہ ملتے ہیں۔`
          : `Apna Okara has ${city.live} live ads in ${name} right now${topNames.length ? `, most of them in ${topNames.join(', ')}` : ''}. Mobiles, bikes, cars, property, jobs and service providers are all in one place.`,
      },
      {
        q: ur ? `${name} میں کاریگر (پلمبر، الیکٹریشن) کیسے تلاش کریں؟` : `How do I find a plumber or electrician in ${name}?`,
        a: ur
          ? `کاریگر کیٹیگری میں ${name} چنیں۔ ابھی ${services.count} کاریگر لسٹ ہیں${services.verified ? `، جن میں ${services.verified} تصدیق شدہ ہیں` : ''}۔ ریٹنگ اور تبصرے دیکھ کر واٹس ایپ یا فون پر براہ راست رابطہ کریں۔`
          : `Open Service Providers and choose ${name}. ${services.count} providers are listed now${services.verified ? `, ${services.verified} of them verified` : ''}. Check ratings and reviews, then contact them directly on WhatsApp or by phone.`,
      },
      {
        q: ur ? `${name} میں اشتہار کیسے لگائیں؟` : `How do I post an ad in ${name}?`,
        a: ur
          ? `"اشتہار لگائیں" دبائیں، کیٹیگری چنیں، شہر میں ${name} منتخب کریں اور تصاویر لگائیں۔ اکاؤنٹ کی ضرورت نہیں۔ ہماری ٹیم کی منظوری کے بعد اشتہار عام طور پر اسی دن لائیو ہو جاتا ہے۔`
          : `Tap “Post Ad”, choose a category, select ${name} as the city and add photos. No account is needed. After our team approves it, the ad usually goes live the same day.`,
      },
    ];
  }

  return (
    <>
      <ListingsView
        locale={locale}
        path={`/city/${city.slug}`}
        title={t('allIn', { city: name })}
        crumbs={[
          { label: t('home'), href: '/' },
          { label: name, href: `/city/${city.slug}` },
        ]}
        fixedCitySlug={city.slug}
        searchParams={searchParams}
      />
      <FaqBlock faqs={faqs} locale={locale} title={tf('faq')} />
    </>
  );
}
