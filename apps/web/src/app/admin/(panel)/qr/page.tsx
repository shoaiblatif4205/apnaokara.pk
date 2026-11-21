import QRCode from 'qrcode';
import { requireAdmin } from '@/lib/admin/auth';
import { getCategories, getCities } from '@/lib/public';
import { getSetting } from '@/lib/settings';
import { SITE_URL } from '@/lib/seo';
import { Field, PageHeader, Section } from '@/components/admin/ui';
import { PrintButton } from '@/components/admin/PrintButton';

export const metadata = { title: 'QR posters' };

type SP = { target?: string; custom?: string; place?: string; lang?: string; headline?: string };

// QR codes for posters in markets, mandi and shops. "?source=" shows in
// Analytics which poster brought the visit.
export default async function QrPage(props: { searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  const [cats, cities, social] = await Promise.all([getCategories(), getCities(), getSetting<Record<string, string | null>>('public.social')]);
  const lang = searchParams.lang === 'en' ? 'en' : 'ur';
  const place = (searchParams.place || 'poster').toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 40) || 'poster';
  const targets: { value: string; label: string; url: string }[] = [
    { value: 'home', label: 'Home page', url: `${SITE_URL}/${lang}` },
    { value: 'post', label: 'Post an ad', url: `${SITE_URL}/${lang}/post-ad` },
    { value: 'community', label: 'Join WhatsApp community page', url: `${SITE_URL}/${lang}/community` },
    { value: 'download', label: 'Get the app', url: `${SITE_URL}/${lang}/download` },
    { value: 'rishta', label: 'Rishta', url: `${SITE_URL}/${lang}/rishta` },
    ...(social?.whatsapp_group ? [{ value: 'wa-group', label: 'WhatsApp group (direct)', url: social.whatsapp_group }] : []),
    ...(social?.whatsapp_channel ? [{ value: 'wa-channel', label: 'WhatsApp channel (direct)', url: social.whatsapp_channel }] : []),
    ...cats.map((c) => ({ value: `cat:${c.slug}`, label: `Category: ${c.name_en}`, url: `${SITE_URL}/${lang}/${c.slug}` })),
    ...cities.map((c) => ({ value: `city:${c.slug}`, label: `City: ${c.name_en}`, url: `${SITE_URL}/${lang}/city/${c.slug}` })),
    { value: 'custom', label: 'Other address (type below)', url: '' },
  ];
  const t = targets.find((x) => x.value === searchParams.target) ?? targets[1];
  let url = t.value === 'custom' ? (searchParams.custom || '').trim() : t.url;
  if (url && !/^https?:\/\//.test(url)) url = `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  const valid = /^https?:\/\/[^\s]+$/.test(url);
  // Track posters only on our own site links
  if (valid && url.startsWith(SITE_URL)) url += `${url.includes('?') ? '&' : '?'}source=qr-${place}`;
  const svg = valid ? await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#14532D', light: '#FFFFFF' } }) : null;
  const png = valid ? await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 1200, color: { dark: '#14532D', light: '#FFFFFF' } }) : null;
  const headline =
    searchParams.headline?.trim() ||
    (lang === 'ur'
      ? t.value === 'post' ? 'اپنا اشتہار لگائیں، 2 منٹ میں' : t.value.startsWith('wa') || t.value === 'community' ? 'ہمارے واٹس ایپ گروپ میں شامل ہوں' : 'اوکاڑہ کا اپنا بازار'
      : t.value === 'post' ? 'Post your ad in 2 minutes' : t.value.startsWith('wa') || t.value === 'community' ? 'Join our WhatsApp group' : "Okara's own marketplace");

  return (
    <>
      <PageHeader title="QR posters" description="Make a QR code for posters and stickers in mobile markets, mandi, shops and notice boards. Scan count shows in Google Analytics as source qr-<place>." />
      <div className="print:hidden">
        <Section title="Make a QR code">
          <form className="grid items-end gap-3 md:grid-cols-2" method="get">
            <Field label="QR opens" htmlFor="target">
              <select id="target" name="target" defaultValue={t.value} className="admin-input">
                {targets.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </Field>
            <Field label="Other address" htmlFor="custom" hint="Only for “Other address”, e.g. /services/plumber/okara">
              <input id="custom" name="custom" defaultValue={searchParams.custom} className="admin-input" dir="ltr" />
            </Field>
            <Field label="Where will it go? (for tracking)" htmlFor="place" hint="e.g. okara-mobile-market, depalpur-mandi">
              <input id="place" name="place" defaultValue={searchParams.place ?? ''} className="admin-input" dir="ltr" />
            </Field>
            <Field label="Poster language" htmlFor="lang">
              <select id="lang" name="lang" defaultValue={lang} className="admin-input">
                <option value="ur">Urdu</option>
                <option value="en">English</option>
              </select>
            </Field>
            <Field label="Big line on poster (optional)" htmlFor="headline">
              <input id="headline" name="headline" defaultValue={searchParams.headline ?? ''} className="admin-input" dir="auto" />
            </Field>
            <button type="submit" className="btn-sm h-10 bg-brand text-white">Make QR</button>
          </form>
        </Section>
      </div>

      {svg && png ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2 print:hidden">
            <a href={png} download={`apna-okara-qr-${place}.png`} className="btn-sm border border-line bg-white">Download PNG</a>
            <a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} download={`apna-okara-qr-${place}.svg`} className="btn-sm border border-line bg-white">Download SVG (for printers)</a>
            <PrintButton label="Print A4 poster" />
            <span className="self-center text-xs text-ink-muted" dir="ltr">{url}</span>
          </div>
          {/* A4 poster preview (prints alone) */}
          <div className="mx-auto max-w-[620px] rounded-2xl border-[10px] border-[#15803D] bg-white p-8 text-center print:max-w-none print:border-[14px]" lang={lang} dir={lang === 'ur' ? 'rtl' : 'ltr'}>
            <p className="text-3xl font-extrabold text-[#14532D]">{lang === 'ur' ? 'اپنا اوکاڑہ' : 'Apna Okara'}</p>
            <p className={`mt-3 text-4xl font-extrabold ${lang === 'ur' ? 'font-urdu leading-[1.9]' : ''}`}>{headline}</p>
            <div className="mx-auto mt-6 w-72 max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="mt-4 text-xl font-semibold">{lang === 'ur' ? 'موبائل کیمرے سے اسکین کریں' : 'Scan with your phone camera'}</p>
            <p className="mt-2 text-lg text-ink-muted">
              {lang === 'ur' ? 'اوکاڑہ · ساہیوال · پاکپتن' : 'Okara · Sahiwal · Pakpattan'} · <span dir="ltr">apnaokara.pk</span>
            </p>
          </div>
        </>
      ) : (
        <p className="card p-6 text-ink-muted">Type a full address (starting with / or https://).</p>
      )}
    </>
  );
}
