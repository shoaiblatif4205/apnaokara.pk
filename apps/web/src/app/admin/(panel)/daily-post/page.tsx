import { formatPrice } from '@apna-okara/shared';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { getCategories, getCities, LIVE } from '@/lib/public';
import { getSetting } from '@/lib/settings';
import { SITE_URL } from '@/lib/seo';
import { Field, PageHeader, Section } from '@/components/admin/ui';
import { CopyButton } from '@/components/admin/CopyButton';

export const metadata = { title: 'Daily post' };

type SP = { hours?: string; count?: string; city?: string; model?: string; lang?: string };
type Ad = { reference: string; slug: string; title: string; price: number | null; price_type: string; city_en: string; city_ur: string; featured: boolean };

const MODELS: [string, string][] = [['', 'All'], ['buy_sell', 'Buy & sell'], ['vehicles', 'Vehicles'], ['property', 'Property'], ['jobs', 'Jobs'], ['services', 'Services'], ['business', 'Business']];

// Ready-made "Top new ads" post for the WhatsApp group / channel and Facebook page.
export default async function DailyPostPage(props: { searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  const hours = Math.min(168, Math.max(6, Number(searchParams.hours) || 24));
  const count = Math.min(20, Math.max(3, Number(searchParams.count) || 10));
  const lang = searchParams.lang === 'en' ? 'en' : 'ur';
  const [cities, , social] = await Promise.all([getCities(), getCategories(), getSetting<Record<string, string | null>>('public.social')]);
  const city = cities.find((c) => c.slug === searchParams.city);
  const model = MODELS.some(([m]) => m && m === searchParams.model) ? searchParams.model! : '';

  const args: unknown[] = [hours];
  let extra = '';
  if (city) {
    args.push(city.id);
    extra += ` and l.city_id = $${args.length}`;
  }
  if (model) {
    args.push(model);
    extra += ` and l.model::text = $${args.length}`;
  }
  const ads = await q<Ad>(
    `select l.reference, l.slug, l.title, l.price, l.price_type, ci.name_en as city_en, ci.name_ur as city_ur,
            (l.is_featured and (l.featured_until is null or l.featured_until > now())) as featured
       from listings l join cities ci on ci.id = l.city_id
      where ${LIVE} and l.approved_at > now() - make_interval(hours => $1::int) ${extra}
      order by featured desc, l.boost_requested desc, (select count(*) from listing_images i where i.listing_id = l.id) > 0 desc, l.views desc, l.approved_at desc
      limit ${count}`,
    args,
  );

  const price = (a: Ad) =>
    a.price_type === 'contact' ? (lang === 'ur' ? 'قیمت کے لیے رابطہ' : 'Contact for price') : a.price_type === 'free' ? (lang === 'ur' ? 'مفت' : 'Free') : a.price ? formatPrice(a.price, lang) : '';
  const link = (a: Ad, source: string) => `${SITE_URL}/${lang}/ad/${a.slug}-${a.reference}?source=${source}`;
  const where = city ? (lang === 'ur' ? city.name_ur : city.name_en) : lang === 'ur' ? 'اوکاڑہ، ساہیوال اور پاکپتن' : 'Okara, Sahiwal & Pakpattan';
  const day = new Date().toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-PK', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'long' });
  const make = (source: string, bold: (s: string) => string) =>
    [
      lang === 'ur' ? `🟢 ${bold(`اپنا اوکاڑہ: آج کے ${ads.length} نئے اشتہار`)} (${day})` : `🟢 ${bold(`Apna Okara: today's ${ads.length} new ads`)} (${day})`,
      `📍 ${where}`,
      '',
      ...ads.map((a, i) => `${i + 1}. ${a.featured ? '⭐ ' : ''}${a.title}${price(a) ? ` · ${price(a)}` : ''} · ${lang === 'ur' ? a.city_ur : a.city_en}\n${link(a, source)}`),
      '',
      lang === 'ur' ? `📢 اپنا اشتہار لگائیں: ${SITE_URL}/ur/post-ad?source=${source}` : `📢 Post your ad: ${SITE_URL}/en/post-ad?source=${source}`,
      // On Facebook, invite people to the WhatsApp group / channel too
      ...((social?.whatsapp_group || social?.whatsapp_channel) && source === 'fb-daily'
        ? [lang === 'ur' ? `💬 روزانہ نئے اشتہار واٹس ایپ پر: ${social.whatsapp_group || social.whatsapp_channel}` : `💬 New ads daily on WhatsApp: ${social.whatsapp_group || social.whatsapp_channel}`]
        : []),
    ].join('\n');
  const wa = make('wa-daily', (s) => `*${s}*`);
  const fb = make('fb-daily', (s) => s);

  return (
    <>
      <PageHeader title="Daily “Top new ads” post" description="Copy and paste into the WhatsApp group / channel and the Facebook page. Featured ads come first. Links count visits as source wa-daily / fb-daily." />
      <Section title="Choose">
        <form method="get" className="grid items-end gap-3 md:grid-cols-6">
          <Field label="New in last" htmlFor="hours">
            <select id="hours" name="hours" defaultValue={String(hours)} className="admin-input">
              {[[24, '24 hours'], [48, '2 days'], [72, '3 days'], [168, '7 days']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="How many" htmlFor="count">
            <select id="count" name="count" defaultValue={String(count)} className="admin-input">
              {[5, 10, 15, 20].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="City" htmlFor="city">
            <select id="city" name="city" defaultValue={city?.slug ?? ''} className="admin-input">
              <option value="">All</option>
              {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name_en}</option>)}
            </select>
          </Field>
          <Field label="Type" htmlFor="model">
            <select id="model" name="model" defaultValue={model} className="admin-input">
              {MODELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Language" htmlFor="lang">
            <select id="lang" name="lang" defaultValue={lang} className="admin-input">
              <option value="ur">Urdu</option>
              <option value="en">English</option>
            </select>
          </Field>
          <button type="submit" className="btn-sm h-10 bg-brand text-white">Make post</button>
        </form>
      </Section>
      {ads.length === 0 ? (
        <p className="card p-6 text-ink-muted">No new live ads in this time. Try a longer time or another city.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {[['WhatsApp', wa], ['Facebook', fb]].map(([name, text]) => (
            <Section key={name} title={name}>
              <textarea readOnly value={text} rows={Math.min(30, text.split('\n').length + 2)} aria-label={`${name} post`} className="admin-input font-mono text-xs" dir={lang === 'ur' ? 'rtl' : 'ltr'} />
              <div className="mt-2 flex gap-2">
                <CopyButton text={text} label={`Copy for ${name}`} />
                {name === 'WhatsApp' && (
                  <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="btn-sm bg-[#1FAF5A] text-white">Open WhatsApp</a>
                )}
              </div>
            </Section>
          ))}
        </div>
      )}
    </>
  );
}
