import { cache } from 'react';
import { formatPrice } from '@apna-okara/shared';
import { q1 } from '@/lib/db';
import { getCategories, getCities, LIVE } from '@/lib/public';

// Live numbers for a category / city page: used in meta descriptions, the
// "quick answer" box and the FAQ block (AEO). Answers come from real ads, so
// Google and AI tools get facts they can quote.

export type Stats = { count: number; priced: number; min: number | null; max: number | null; median: number | null; newest: Date | null; verified: number };

export const categoryStats = cache(async (f: { categorySlug?: string; subSlug?: string; citySlug?: string }): Promise<Stats> => {
  const [cats, cities] = await Promise.all([getCategories(), getCities()]);
  const where = [LIVE];
  const args: unknown[] = [];
  const cat = f.categorySlug ? cats.find((c) => c.slug === f.categorySlug) : undefined;
  if (cat) {
    args.push(cat.id);
    where.push(`l.category_id = $${args.length}`);
    const sub = f.subSlug ? cat.subs.find((s) => s.slug === f.subSlug) : undefined;
    if (sub) {
      args.push(sub.id);
      where.push(`l.subcategory_id = $${args.length}`);
    }
  }
  const city = f.citySlug ? cities.find((c) => c.slug === f.citySlug) : undefined;
  if (city) {
    args.push(city.id);
    where.push(`l.city_id = $${args.length}`);
  }
  const r = await q1<{ count: number; priced: number; min: number | null; max: number | null; median: number | null; newest: Date | null; verified: number }>(
    `select count(*)::int as count,
            count(l.price) filter (where l.price > 0)::int as priced,
            min(l.price) filter (where l.price > 0) as min,
            max(l.price) filter (where l.price > 0) as max,
            (percentile_cont(0.5) within group (order by l.price) filter (where l.price > 0))::int as median,
            max(l.approved_at) as newest,
            count(*) filter (where l.is_verified)::int as verified
       from listings l where ${where.join(' and ')}`,
    args,
  );
  return r ?? { count: 0, priced: 0, min: null, max: null, median: null, newest: null, verified: 0 };
});

export type Faq = { q: string; a: string };

/** Questions and short direct answers (40–60 words) for a listing page. */
export function listingFaq(o: {
  locale: 'en' | 'ur';
  what: string; // "Mobile Phones"
  where: string; // "Okara" or "Okara, Sahiwal and Pakpattan"
  model: string;
  stats: Stats;
  postPrice: number | null; // cheapest plan
}): Faq[] {
  const { locale, what, where, stats, model } = o;
  const rs = (n: number | null) => (n == null ? '' : formatPrice(n, locale));
  const provider = model === 'services' || model === 'business';
  const job = model === 'jobs';
  const out: Faq[] = [];
  if (locale === 'ur') {
    out.push({
      q: `${where} میں ${what} کے کتنے اشتہار ہیں؟`,
      a: stats.count
        ? `اس وقت اپنا اوکاڑہ پر ${where} میں ${what} کے ${stats.count} لائیو اشتہار ہیں${stats.verified && provider ? `، جن میں ${stats.verified} تصدیق شدہ ہیں` : ''}۔ ہر اشتہار ہماری ٹیم چیک کرتی ہے اور نئے اشتہار روزانہ شامل ہوتے ہیں۔`
        : `ابھی ${where} میں ${what} کا کوئی لائیو اشتہار نہیں۔ نئے اشتہار روزانہ شامل ہوتے ہیں، یا آپ خود اپنا اشتہار لگا سکتے ہیں۔`,
    });
    if (stats.priced >= 3 && !job)
      out.push({
        q: `${where} میں ${what} کی قیمت کتنی ہے؟`,
        a: `اپنا اوکاڑہ کے موجودہ اشتہاروں میں ${where} میں ${what} کی قیمت ${rs(stats.min)} سے ${rs(stats.max)} تک ہے، اور درمیانی قیمت تقریباً ${rs(stats.median)} ہے۔ قیمت حالت، ماڈل اور جگہ کے حساب سے بدلتی ہے۔`,
      });
    out.push(
      provider
        ? { q: `${where} میں اچھا ${what} کیسے تلاش کریں؟`, a: `تصدیق شدہ نشان اور ستاروں والی ریٹنگ دیکھیں، دوسرے گاہکوں کے تبصرے پڑھیں، اور واٹس ایپ پر کام اور ریٹ پہلے طے کریں۔ کام مکمل ہونے کے بعد ادائیگی کریں اور اپنا تبصرہ ضرور لکھیں۔` }
        : job
          ? { q: `${where} میں نوکری کیسے تلاش کریں؟`, a: `نوکریوں کے اشتہار کھولیں، تنخواہ اور جگہ کے فلٹر لگائیں اور واٹس ایپ یا فون پر رابطہ کریں۔ نوکری کے لیے کبھی پیشگی فیس نہ دیں؛ ایسا اشتہار ہمیں رپورٹ کریں۔` }
          : { q: `${where} میں ${what} محفوظ طریقے سے کیسے خریدیں؟`, a: `بیچنے والے سے دن کے وقت عوامی جگہ پر ملیں، چیز اچھی طرح دیکھ کر ادائیگی کریں اور کبھی پیشگی رقم نہ بھیجیں۔ کاغذات چیک کریں اور مشکوک اشتہار کی شکایت کریں۔` },
    );
    out.push({
      q: `${where} میں ${provider ? 'اپنی سروس' : what} کا اشتہار کیسے لگائیں؟`,
      a: `"اشتہار لگائیں" دبائیں، کیٹیگری اور شہر چنیں، تفصیل اور تصاویر لگائیں۔ اکاؤنٹ کی ضرورت نہیں، صرف فون نمبر چاہیے۔${o.postPrice ? ` قیمت ${rs(o.postPrice)} سے شروع ہے۔` : ''} ٹیم کی منظوری کے بعد اشتہار لائیو ہو جاتا ہے۔`,
    });
  } else {
    out.push({
      q: `How many ${what} ads are there in ${where}?`,
      a: stats.count
        ? `Right now Apna Okara has ${stats.count} live ${what} ads in ${where}${stats.verified && provider ? `, of which ${stats.verified} are verified` : ''}. Every ad is checked by our team before it goes live, and new ads are added every day.`
        : `There are no live ${what} ads in ${where} right now. New ads are added every day, or you can post your own ad for free during offers.`,
    });
    if (stats.priced >= 3 && !job)
      out.push({
        q: `What is the price of ${what} in ${where}?`,
        a: `In current Apna Okara ads, ${what} in ${where} are priced from ${rs(stats.min)} to ${rs(stats.max)}, with a typical (median) price of about ${rs(stats.median)}. Prices depend on condition, model and location.`,
      });
    out.push(
      provider
        ? { q: `How do I find a good ${what} in ${where}?`, a: `Look for the Verified badge and star ratings, read reviews from other customers, and agree on the work and rate on WhatsApp first. Pay after the work is done, then leave a review to help others.` }
        : job
          ? { q: `How do I find a job in ${where}?`, a: `Open the jobs ads, filter by salary and city, and contact the employer on WhatsApp or by phone. Never pay any fee to get a job; report such ads to us.` }
          : { q: `How do I buy ${what} safely in ${where}?`, a: `Meet the seller in a busy public place in daylight, check the item carefully before paying and never send money in advance. Check papers where needed and report any suspicious ad.` },
    );
    out.push({
      q: `How do I post ${provider ? 'my service' : `a ${what} ad`} in ${where}?`,
      a: `Tap “Post Ad”, choose the category and city, and add details and photos. No account is needed, only a phone number.${o.postPrice ? ` Prices start from ${rs(o.postPrice)}.` : ''} The ad goes live after our team approves it, usually the same day.`,
    });
  }
  return out;
}
