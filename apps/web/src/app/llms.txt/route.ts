import { AD_DURATIONS, PROVIDER_PLAN } from '@apna-okara/shared';
import { q } from '@/lib/db';
import { getCategories, getCities } from '@/lib/public';
import { getSetting } from '@/lib/settings';
import { getSeo, SITE_URL } from '@/lib/seo';
import { latestPosts } from '@/lib/blog';

export const dynamic = 'force-dynamic';

// llms.txt: a plain summary of the site for AI assistants and AI search (GEO).
// Facts here (areas, prices, how it works) are read from the database so they stay correct.
export async function GET() {
  const [seo, cats, cities, prices, contact, posts] = await Promise.all([
    getSeo(),
    getCategories(),
    getCities(),
    q<{ model: string; duration_days: number; price: number }>('select model::text, duration_days, price from pricing where is_active and category_id is null'),
    getSetting<{ email: string | null; phone: string | null; whatsapp: string | null }>('public.contact'),
    latestPosts('en', 10),
  ]);
  const price = (m: string, d: number) => prices.find((p) => p.model === m && p.duration_days === d)?.price;
  const adPrices = AD_DURATIONS.map((d) => `${d} days Rs ${price('buy_sell', d) ?? '-'}`).join(', ');
  const live = cats.reduce((s, c) => s + c.live, 0);
  const u = (p: string) => `${SITE_URL}/en${p}`;

  const lines = [
    '# Apna Okara',
    '',
    '> Apna Okara (apnaokara.pk, Urdu: اپنا اوکاڑہ) is a local online marketplace only for Okara, Sahiwal and Pakpattan districts in Punjab, Pakistan. People buy and sell new and used items, vehicles and property, find jobs, local service providers (plumbers, electricians, tutors and more), local businesses, and a private rishta (matrimonial) service. Every ad is checked by the Apna Okara team before it goes live. The website is in Urdu and English.',
    '',
    '## Key facts',
    '- Founded by Shagufta Latif, from Okara. Website designed and built by Shoaib Latif (https://shoaiblatif.tech).',
    `- Areas served: ${cities.map((c) => c.name_en).join(', ')} (Okara, Sahiwal and Pakpattan districts).`,
    `- Live ads right now: about ${live}.`,
    '- Posting an ad needs only a phone number (no account). The seller gets a reference number like AO-10001 to manage the ad.',
    `- Ad prices (buy & sell, vehicles, property, jobs): ${adPrices}. Service providers and businesses: Rs ${price('services', PROVIDER_PLAN.days) ?? PROVIDER_PLAN.price} for 2 months. Sometimes ads are free during offers.`,
    '- Payment: JazzCash, Easypaisa or bank transfer, checked by the team.',
    '- Buyers contact sellers directly on WhatsApp or phone. Apna Okara does not sell items itself.',
    '- Rishta: private. Names and phone numbers are never public; contact is shared only when both families agree.',
    ...(contact?.phone || contact?.email || contact?.whatsapp
      ? [`- Contact: ${[contact.phone && `phone ${contact.phone}`, contact.whatsapp && `WhatsApp ${contact.whatsapp}`, contact.email && `email ${contact.email}`].filter(Boolean).join(', ')}.`]
      : []),
    '',
    '## Main pages',
    `- [Home](${SITE_URL}/en): latest and featured ads (Urdu: ${SITE_URL}/ur)`,
    `- [All categories](${u('/categories')})`,
    `- [Post an ad](${u('/post-ad')})`,
    `- [Pricing](${u('/pricing')})`,
    `- [How it works](${u('/how-it-works')})`,
    `- [FAQ](${u('/faq')})`,
    `- [Safety tips](${u('/safety')})`,
    `- [Posting rules](${u('/posting-rules')})`,
    `- [Advertise (brand banners)](${u('/advertise')})`,
    `- [Rishta](${u('/rishta')})`,
    `- [About](${u('/about')})`,
    `- [Contact](${u('/contact')})`,
    `- [Blog](${u('/blog')})`,
    '',
    '## Categories',
    ...cats.map((c) => `- [${c.name_en}](${u(`/${c.slug}`)})${c.subs.length ? `: ${c.subs.map((s) => s.name_en).join(', ')}` : ''}`),
    '',
    '## Cities',
    ...cities.map((c) => `- [${c.name_en}](${u(`/city/${c.slug}`)})`),
    ...(posts.length ? ['', '## Recent articles', ...posts.map((p) => `- [${p.title}](${u(`/blog/${p.slug}`)})${p.excerpt ? `: ${p.excerpt}` : ''}`)] : []),
    ...(seo.llms_extra.trim() ? ['', '## More information', seo.llms_extra.trim()] : []),
    '',
    '## Optional',
    `- [Sitemap](${SITE_URL}/sitemap.xml)`,
    `- [Terms](${u('/terms')}), [Privacy](${u('/privacy')})`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
