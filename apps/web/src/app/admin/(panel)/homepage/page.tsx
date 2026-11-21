import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { toPkInput } from '@/lib/admin/form';
import { Badge, Checkbox, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { saveHouseBanner, saveSection } from './actions';

export const metadata = { title: 'Homepage' };

const SECTION_LABELS: Record<string, string> = {
  top_bar: 'Top bar',
  offer_bar: 'Offer bar (text in Site settings)',
  hero: 'Hero: slider + 2 side banners',
  trust_points: 'Trust points',
  categories: 'Categories grid',
  featured: 'Featured ads',
  wide_banner: 'Wide banner',
  fresh_ads: 'Fresh ads',
  seasonal: 'Seasonal section',
  services: 'Top service providers',
  rishta: 'Rishta (with recent profiles, safe details only)',
  city_tabs: 'Popular in your city',
  jobs: 'Latest jobs',
  businesses: 'Local businesses',
  how_it_works: 'How it works',
  cities: 'Browse by city',
  brands: 'For brands (advertise)',
  community_app: 'WhatsApp community + app',
  blog: 'From the blog',
  faq: 'FAQ',
  seo_text: 'SEO text',
};

const PLACEMENT_LABELS: Record<string, string> = {
  hero_slider: 'Hero slider (big, left)',
  hero_side: 'Hero side (2 small, right)',
  home_strip: 'Wide banner strip',
  category_top: 'Top of category pages',
  in_feed: 'Inside ad lists (every 8 ads)',
  ad_detail: 'Ad page',
  app_home: 'App home screen',
};

type Section = { key: string; is_enabled: boolean; sort_order: number; title_en: string | null; title_ur: string | null; config: Record<string, unknown> };
type Banner = {
  id: string; placement: string; title_en: string | null; title_ur: string | null; subtitle_en: string | null; subtitle_ur: string | null;
  button_en: string | null; button_ur: string | null; link_url: string | null; image_desktop_path: string | null; image_mobile_path: string | null;
  starts_at: string | null; ends_at: string | null; sort_order: number; status: string; clicks: number;
};

function BannerForm({ b }: { b?: Banner }) {
  const p = b ? `b-${b.id.slice(0, 8)}` : 'new';
  return (
    <form action={saveHouseBanner} className="grid gap-3 md:grid-cols-4">
      {b && <input type="hidden" name="id" value={b.id} />}
      <Field label="Where" htmlFor={`${p}-pl`}>
        <select id={`${p}-pl`} name="placement" defaultValue={b?.placement ?? 'hero_slider'} className="admin-input">
          {Object.entries(PLACEMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title (English)" htmlFor={`${p}-te`}>
        <input id={`${p}-te`} name="title_en" defaultValue={b?.title_en ?? ''} className="admin-input" />
      </Field>
      <Field label="Title (Urdu)" htmlFor={`${p}-tu`}>
        <input id={`${p}-tu`} name="title_ur" defaultValue={b?.title_ur ?? ''} className="admin-input-ur" dir="rtl" />
      </Field>
      <Field label="Order" htmlFor={`${p}-so`}>
        <input id={`${p}-so`} name="sort_order" type="number" defaultValue={b?.sort_order ?? 0} className="admin-input" />
      </Field>
      <Field label="Text (English)" htmlFor={`${p}-se`}>
        <input id={`${p}-se`} name="subtitle_en" defaultValue={b?.subtitle_en ?? ''} className="admin-input" />
      </Field>
      <Field label="Text (Urdu)" htmlFor={`${p}-su`}>
        <input id={`${p}-su`} name="subtitle_ur" defaultValue={b?.subtitle_ur ?? ''} className="admin-input-ur" dir="rtl" />
      </Field>
      <Field label="Button (English)" htmlFor={`${p}-be`}>
        <input id={`${p}-be`} name="button_en" defaultValue={b?.button_en ?? ''} className="admin-input" />
      </Field>
      <Field label="Button (Urdu)" htmlFor={`${p}-bu`}>
        <input id={`${p}-bu`} name="button_ur" defaultValue={b?.button_ur ?? ''} className="admin-input-ur" dir="rtl" />
      </Field>
      <Field label="Link" htmlFor={`${p}-l`} hint="/post-ad or https://…">
        <input id={`${p}-l`} name="link_url" defaultValue={b?.link_url ?? ''} className="admin-input" />
      </Field>
      <Field label="Start (optional)" htmlFor={`${p}-sa`}>
        <input id={`${p}-sa`} name="starts_at" type="datetime-local" defaultValue={toPkInput(b?.starts_at)} className="admin-input" />
      </Field>
      <Field label="End (optional)" htmlFor={`${p}-ea`}>
        <input id={`${p}-ea`} name="ends_at" type="datetime-local" defaultValue={toPkInput(b?.ends_at)} className="admin-input" />
      </Field>
      <div className="flex items-end">
        <Checkbox id={`${p}-ac`} name="active" label="Active" defaultChecked={b ? b.status === 'running' : true} />
      </div>
      <Field label="Image, computer (optional)" htmlFor={`${p}-id`} hint="Hero 1200x400, side 400x195, strip 1200x200">
        <input id={`${p}-id`} name="image_desktop" type="file" accept="image/*" className="block w-full text-sm" />
      </Field>
      <Field label="Image, mobile (optional)" htmlFor={`${p}-im`} hint="800x400">
        <input id={`${p}-im`} name="image_mobile" type="file" accept="image/*" className="block w-full text-sm" />
      </Field>
      {b?.image_desktop_path && (
        <div className="flex items-end gap-3 md:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/files/banners/${b.image_desktop_path}`} alt="" className="h-16 rounded border border-line object-cover" />
          <Checkbox id={`${p}-rm`} name="remove_images" label="Remove images" />
        </div>
      )}
      <div className="md:col-span-4">
        <SubmitButton className="btn-sm border border-line bg-white hover:border-brand">{b ? 'Save banner' : 'Add banner'}</SubmitButton>
      </div>
    </form>
  );
}

export default async function HomepageManager(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin();
  const [sections, banners, cats] = await Promise.all([
    q<Section>('select key, is_enabled, sort_order, title_en, title_ur, config from homepage_sections order by sort_order'),
    q<Banner>(
      `select b.*, coalesce((select sum(clicks)::int from banner_stats s where s.banner_id = b.id), 0) as clicks
         from banners b where owner_type = 'house' order by placement, sort_order, created_at`,
    ),
    q<{ slug: string; name_en: string }>('select slug, name_en from categories where parent_id is null and is_active order by sort_order'),
  ]);

  return (
    <>
      <PageHeader
        title="Homepage"
        description="Turn home page sections on or off, change their order and titles, and manage our own banners and hero slides. The default green hero slide is always first."
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      <Section title="Sections" description="Smaller order number shows higher. Leave titles empty to use the normal titles.">
        <div className="space-y-2">
          {sections.map((s) => (
            <form key={s.key} action={saveSection} className="grid items-end gap-2 rounded-lg border border-line p-3 lg:grid-cols-[200px_80px_1fr_1fr_auto_auto]">
              <input type="hidden" name="key" value={s.key} />
              <p className="text-sm font-semibold">{SECTION_LABELS[s.key] ?? s.key}</p>
              <Field label="Order" htmlFor={`o-${s.key}`}>
                <input id={`o-${s.key}`} name="sort_order" type="number" defaultValue={s.sort_order} className="admin-input" />
              </Field>
              <Field label="Title (English)" htmlFor={`te-${s.key}`}>
                <input id={`te-${s.key}`} name="title_en" defaultValue={s.title_en ?? ''} className="admin-input" />
              </Field>
              <Field label="Title (Urdu)" htmlFor={`tu-${s.key}`}>
                <input id={`tu-${s.key}`} name="title_ur" defaultValue={s.title_ur ?? ''} className="admin-input-ur" dir="rtl" />
              </Field>
              <div className="flex flex-wrap items-end gap-3">
                {s.key === 'seasonal' && (
                  <Field label="Category" htmlFor="seasonal-cat">
                    <select id="seasonal-cat" name="category_slug" defaultValue={(s.config?.category_slug as string) ?? ''} className="admin-input">
                      <option value="">Choose</option>
                      {cats.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name_en}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Checkbox id={`e-${s.key}`} name="is_enabled" label="Show" defaultChecked={s.is_enabled} />
              </div>
              <SubmitButton className="btn-sm border border-line bg-white hover:border-brand">Save</SubmitButton>
            </form>
          ))}
        </div>
      </Section>

      <Section title={`Our banners and hero slides (${banners.length})`} description="Sales, offers, “Post your ad free”, “Join WhatsApp”. When no paid brand banner is booked for a place, these show there.">
        <div className="space-y-4">
          {banners.map((b) => (
            <div key={b.id} className="rounded-lg border border-line p-3">
              <p className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{b.title_en || b.title_ur || 'Image banner'}</span>
                <Badge>{PLACEMENT_LABELS[b.placement] ?? b.placement}</Badge>
                {b.status === 'running' ? <Badge tone="green">Active</Badge> : <Badge>Paused</Badge>}
                <span className="text-ink-muted">{b.clicks} clicks</span>
              </p>
              <BannerForm b={b} />
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-lg bg-page p-3">
          <p className="mb-3 text-sm font-semibold">Add a banner</p>
          <BannerForm />
        </div>
      </Section>
    </>
  );
}
