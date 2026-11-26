import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { AI_BOTS, DEFAULT_SEO, getSeo, type SeoSettings } from '@/lib/seo';
import { Checkbox, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { addRedirect, deleteRedirect, saveSeo } from './actions';

export const metadata = { title: 'SEO' };

const TPL: { key: keyof SeoSettings['templates']; label: string; vars: string; example: string }[] = [
  { key: 'category', label: 'Category page', vars: '{category}', example: '/mobiles' },
  { key: 'categoryCity', label: 'Category + city page', vars: '{category} {city}', example: '/mobiles/okara, /services/plumber/sahiwal' },
  { key: 'city', label: 'City page', vars: '{city}', example: '/city/okara' },
  { key: 'ad', label: 'Ad page', vars: '{title} {price} {city} {category}', example: '/ad/…' },
  { key: 'provider', label: 'Service / business page', vars: '{title} {category} {city} {rating}', example: '/ad/… (services, business)' },
];

export default async function SeoPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin([]);
  const [seo, redirects] = await Promise.all([
    getSeo(),
    q<{ id: number; from_path: string; to_path: string; status_code: number }>('select * from redirects order by id desc'),
  ]);

  return (
    <>
      <PageHeader
        title="SEO, AEO & GEO"
        description="How the site appears on Google and in AI answers (ChatGPT, Gemini, Perplexity, Claude). Titles end with “| Apna Okara” automatically."
        actions={
          <span className="flex flex-wrap gap-2">
            {['/sitemap.xml', '/robots.txt', '/llms.txt'].map((p) => (
              <a key={p} href={p} target="_blank" rel="noreferrer" className="btn-sm border border-line bg-white">
                {p}
              </a>
            ))}
          </span>
        }
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      <form action={saveSeo}>
        <Section title="Page title templates" description="Words in {curly brackets} are filled in for each page. A category’s own SEO title (Categories page) wins over the template.">
          <div className="space-y-4">
            {TPL.map((t) => (
              <div key={t.key} className="rounded-lg border border-line p-3">
                <p className="text-sm font-semibold">
                  {t.label} <span className="font-normal text-ink-muted">· {t.example} · you can use {t.vars}</span>
                </p>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <Field label="English" htmlFor={`t_${t.key}_en`}>
                    <input id={`t_${t.key}_en`} name={`t_${t.key}_en`} defaultValue={seo.templates[t.key].en} placeholder={DEFAULT_SEO.templates[t.key].en} className="admin-input" />
                  </Field>
                  <Field label="Urdu" htmlFor={`t_${t.key}_ur`}>
                    <input id={`t_${t.key}_ur`} name={`t_${t.key}_ur`} defaultValue={seo.templates[t.key].ur} placeholder={DEFAULT_SEO.templates[t.key].ur} className="admin-input-ur" dir="rtl" />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Google and Bing" description="From Google Search Console and Bing Webmaster Tools (choose the “HTML tag” method and paste the code or the whole tag).">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Google Search Console code" htmlFor="gsc_verification">
              <input id="gsc_verification" name="gsc_verification" defaultValue={seo.gsc_verification ?? ''} className="admin-input" dir="ltr" />
            </Field>
            <Field label="Bing code" htmlFor="bing_verification">
              <input id="bing_verification" name="bing_verification" defaultValue={seo.bing_verification ?? ''} className="admin-input" dir="ltr" />
            </Field>
            <Field label="Google Analytics 4 ID" htmlFor="ga4_id" hint="Like G-XXXXXXXXXX. Runs only on the live site.">
              <input id="ga4_id" name="ga4_id" defaultValue={seo.ga4_id ?? ''} className="admin-input" dir="ltr" placeholder="G-" />
            </Field>
            <Field label="Google Tag Manager ID" htmlFor="gtm_id" hint="Like GTM-XXXXXXX. Runs only on the live site. If your Google Analytics is set up inside Tag Manager, leave the GA4 box empty so visits are not counted twice.">
              <input id="gtm_id" name="gtm_id" defaultValue={seo.gtm_id ?? ''} className="admin-input" dir="ltr" placeholder="GTM-" />
            </Field>
          </div>
        </Section>

        <Section title="Crawlers (robots.txt)" description="Admin, member pages, Rishta profiles, My Ad, saved ads and the API are always blocked.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="AI assistants and AI search" htmlFor="ai_crawlers" hint={AI_BOTS.join(', ')}>
              <select id="ai_crawlers" name="ai_crawlers" defaultValue={seo.ai_crawlers} className="admin-input">
                <option value="allow">Allow: AI tools can read public pages and mention Apna Okara (recommended)</option>
                <option value="block">Block all AI crawlers</option>
              </select>
            </Field>
            <Field label="Also block these addresses" htmlFor="blocked_paths" hint="One per line, starting with /">
              <textarea id="blocked_paths" name="blocked_paths" rows={3} defaultValue={seo.blocked_paths} className="admin-input font-mono text-xs" dir="ltr" />
            </Field>
            <div className="md:col-span-2">
              <Checkbox name="index_empty_city_pages" label="List city pages with no ads in the sitemap (normally off: empty pages can hurt Google ranking)" defaultChecked={seo.index_empty_city_pages} />
            </div>
          </div>
        </Section>

        <Section title="llms.txt (for AI tools)" description="llms.txt already lists the areas, prices, categories, cities, main pages and latest articles. Add anything else AI tools should know: since when you work, the owner’s name, office address, awards.">
          <textarea id="llms_extra" name="llms_extra" aria-label="Extra text for llms.txt" rows={5} defaultValue={seo.llms_extra} className="admin-input" />
        </Section>

        <div className="mb-8">
          <SubmitButton>Save SEO settings</SubmitButton>
        </div>
      </form>

      <Section title={`Redirects (${redirects.length})`} description="Send an old address to a new one, e.g. after renaming a category. 301 = moved for ever (best for Google). Takes up to 2 minutes to start working.">
        {redirects.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Old address</th>
                  <th>New address</th>
                  <th>Type</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {redirects.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs" dir="ltr">{r.from_path}</td>
                    <td className="font-mono text-xs" dir="ltr">{r.to_path}</td>
                    <td>{r.status_code}</td>
                    <td>
                      <form action={deleteRedirect}>
                        <input type="hidden" name="id" value={r.id} />
                        <SubmitButton className="btn-danger" confirm="Remove this redirect?">Remove</SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form action={addRedirect} className="grid items-end gap-3 rounded-lg bg-page p-3 md:grid-cols-[1fr_1fr_120px_auto]">
          <Field label="Old address" htmlFor="from_path" hint="e.g. /bikes or /ur/bikes">
            <input id="from_path" name="from_path" required className="admin-input" dir="ltr" placeholder="/old-page" />
          </Field>
          <Field label="New address" htmlFor="to_path" hint="e.g. /vehicles/motorcycles">
            <input id="to_path" name="to_path" required className="admin-input" dir="ltr" placeholder="/new-page" />
          </Field>
          <Field label="Type" htmlFor="status_code">
            <select id="status_code" name="status_code" className="admin-input">
              <option value="301">301</option>
              <option value="302">302 (for now)</option>
            </select>
          </Field>
          <SubmitButton>Add redirect</SubmitButton>
        </form>
      </Section>
    </>
  );
}
