import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { toPkInput } from '@/lib/admin/form';
import { BANNER_PLACEMENTS, PLACEMENT_INFO, type Placement } from '@/lib/bannerConfig';
import { Badge, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { approveBanner, extendBanner, rejectBanner, saveBanner, setBannerStatus } from '../actions';

export const metadata = { title: 'Banner' };

type B = {
  id: string; business_name: string | null; contact_name: string | null; contact_phone: string | null; contact_whatsapp: string | null; placement: string;
  title_en: string | null; title_ur: string | null; subtitle_en: string | null; subtitle_ur: string | null; link_url: string | null;
  image_desktop_path: string | null; image_mobile_path: string | null; target_city_ids: number[] | null; target_category_ids: number[] | null;
  target_platform: string; starts_at: string | null; ends_at: string | null; days: number | null; price: number | null; status: string; is_free: boolean;
  needs_design: boolean; reject_reason: string | null; stats_token: string; sort_order: number; created_at: string;
};

export default async function BannerDetail(props: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const b = await q1<B>(`select * from banners where id = $1 and owner_type = 'brand'`, [params.id]);
  if (!b) notFound();
  const [payments, stats, cities, cats] = await Promise.all([
    q<{ id: string; amount: number; method: string; transaction_id: string | null; screenshot_path: string | null; status: string; items: { label: string; amount: number }[]; discount: number }>(
      'select id, amount, method::text, transaction_id, screenshot_path, status::text, items, discount from payments where banner_id = $1 order by created_at desc',
      [b.id],
    ),
    q1<{ views: number; clicks: number }>('select coalesce(sum(views), 0)::int as views, coalesce(sum(clicks), 0)::int as clicks from banner_stats where banner_id = $1', [b.id]),
    q<{ id: number; name_en: string }>('select id, name_en from cities where is_active order by sort_order'),
    q<{ id: number; name_en: string }>('select id, name_en from categories where parent_id is null and is_active order by sort_order'),
  ]);
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/banners" className="text-brand hover:underline">
          ← All banners
        </Link>
      </p>
      <PageHeader
        title={b.business_name ?? 'Brand banner'}
        description={`${PLACEMENT_INFO[b.placement as Placement]?.en ?? b.placement} · ${b.days ?? '-'} days · ${stats?.views ?? 0} views · ${stats?.clicks ?? 0} clicks`}
        actions={<Badge tone={b.status === 'running' ? 'green' : b.status === 'rejected' ? 'red' : 'orange'}>{b.status}</Badge>}
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      <Section title="Actions">
        <div className="flex flex-wrap items-end gap-3">
          {b.status === 'pending' && (
            <>
              <form action={approveBanner}>
                <input type="hidden" name="id" value={b.id} />
                <SubmitButton className="btn-primary" confirm="Payment received and banner looks fine? It goes live on its start date.">
                  Approve (payment received)
                </SubmitButton>
              </form>
              <form action={approveBanner}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="free" value="true" />
                <SubmitButton className="btn-sm border border-line bg-white" confirm="Approve this banner for free?">
                  Approve free
                </SubmitButton>
              </form>
              <form action={rejectBanner} className="flex items-end gap-2">
                <input type="hidden" name="id" value={b.id} />
                <Field label="Reject: reason" htmlFor="rj">
                  <input id="rj" name="reason" className="admin-input w-56" />
                </Field>
                <SubmitButton className="btn-danger">Reject</SubmitButton>
              </form>
            </>
          )}
          {(b.status === 'running' || b.status === 'scheduled') && (
            <form action={setBannerStatus}>
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="to" value="paused" />
              <SubmitButton className="btn-sm border border-line bg-white">Pause</SubmitButton>
            </form>
          )}
          {b.status === 'paused' && (
            <form action={setBannerStatus}>
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="to" value="running" />
              <SubmitButton className="btn-sm border border-line bg-white">Resume</SubmitButton>
            </form>
          )}
          {['running', 'scheduled', 'paused', 'expired'].includes(b.status) && (
            <form action={extendBanner} className="flex items-end gap-2">
              <input type="hidden" name="id" value={b.id} />
              <Field label="Add days" htmlFor="ext">
                <input id="ext" name="days" type="number" min={1} max={365} defaultValue={7} className="admin-input w-24" />
              </Field>
              <SubmitButton className="btn-sm border border-line bg-white">Extend</SubmitButton>
            </form>
          )}
          <a href={`${site}/en/banner-stats/${b.stats_token}`} target="_blank" rel="noreferrer" className="btn-sm border border-line bg-white">
            Brand stats link
          </a>
        </div>
        {b.needs_design && <p className="mt-3 rounded-lg bg-accent-light p-2 text-sm text-orange-900">The brand asked us to design this banner. Upload the image below before approving.</p>}
        {b.reject_reason && <p className="mt-3 text-sm text-red-800">Rejected: {b.reject_reason}</p>}
      </Section>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Section title="Banner">
          <form action={saveBanner} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="id" value={b.id} />
            {b.image_desktop_path && (
              <div className="md:col-span-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/files/banners/${b.image_desktop_path}`} alt="Banner" className="max-h-56 rounded-lg border border-line" />
              </div>
            )}
            <Field label="Business name" htmlFor="bn">
              <input id="bn" name="business_name" defaultValue={b.business_name ?? ''} className="admin-input" />
            </Field>
            <Field label="Place" htmlFor="bp">
              <select id="bp" name="placement" defaultValue={b.placement} className="admin-input">
                {BANNER_PLACEMENTS.map((p) => (
                  <option key={p} value={p}>
                    {PLACEMENT_INFO[p].en}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title (English)" htmlFor="bte">
              <input id="bte" name="title_en" defaultValue={b.title_en ?? ''} className="admin-input" />
            </Field>
            <Field label="Title (Urdu)" htmlFor="btu">
              <input id="btu" name="title_ur" defaultValue={b.title_ur ?? ''} className="admin-input-ur" dir="rtl" />
            </Field>
            <Field label="Text (English)" htmlFor="bse">
              <input id="bse" name="subtitle_en" defaultValue={b.subtitle_en ?? ''} className="admin-input" />
            </Field>
            <Field label="Text (Urdu)" htmlFor="bsu">
              <input id="bsu" name="subtitle_ur" defaultValue={b.subtitle_ur ?? ''} className="admin-input-ur" dir="rtl" />
            </Field>
            <Field label="Link" htmlFor="bl">
              <input id="bl" name="link_url" defaultValue={b.link_url ?? ''} className="admin-input" />
            </Field>
            <Field label="Show on" htmlFor="bpl">
              <select id="bpl" name="target_platform" defaultValue={b.target_platform} className="admin-input">
                <option value="both">Website and app</option>
                <option value="web">Website</option>
                <option value="app">App</option>
              </select>
            </Field>
            <Field label="Start" htmlFor="bsa">
              <input id="bsa" name="starts_at" type="datetime-local" defaultValue={toPkInput(b.starts_at)} className="admin-input" />
            </Field>
            <Field label="End" htmlFor="bea">
              <input id="bea" name="ends_at" type="datetime-local" defaultValue={toPkInput(b.ends_at)} className="admin-input" />
            </Field>
            <Field label="Order" htmlFor="bso">
              <input id="bso" name="sort_order" type="number" defaultValue={b.sort_order} className="admin-input" />
            </Field>
            <div />
            <Field label="New image (computer)" htmlFor="bid">
              <input id="bid" name="image_desktop" type="file" accept="image/*" className="block w-full text-sm" />
            </Field>
            <Field label="New image (mobile)" htmlFor="bim">
              <input id="bim" name="image_mobile" type="file" accept="image/*" className="block w-full text-sm" />
            </Field>
            <fieldset className="md:col-span-2">
              <legend className="admin-label">Cities (none = all)</legend>
              <div className="flex flex-wrap gap-3 text-sm">
                {cities.map((c) => (
                  <label key={c.id} className="inline-flex items-center gap-1">
                    <input type="checkbox" name="city_ids" value={c.id} defaultChecked={b.target_city_ids?.includes(c.id)} className="accent-brand" /> {c.name_en}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="md:col-span-2">
              <legend className="admin-label">Categories (none = all)</legend>
              <div className="flex flex-wrap gap-3 text-sm">
                {cats.map((c) => (
                  <label key={c.id} className="inline-flex items-center gap-1">
                    <input type="checkbox" name="category_ids" value={c.id} defaultChecked={b.target_category_ids?.includes(c.id)} className="accent-brand" /> {c.name_en}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="md:col-span-2">
              <SubmitButton className="btn-sm border border-line bg-white hover:border-brand">Save banner</SubmitButton>
            </div>
          </form>
        </Section>

        <div>
          <Section title="Contact">
            <p className="text-sm">
              {b.contact_name ?? '-'}
              <br />
              {b.contact_phone && (
                <a href={`tel:${b.contact_phone}`} className="text-brand">
                  {b.contact_phone}
                </a>
              )}
              {b.contact_whatsapp ? ` · WhatsApp ${b.contact_whatsapp}` : ''}
            </p>
          </Section>
          <Section title="Payment">
            <ul className="space-y-3 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="rounded-lg border border-line p-2">
                  <p className="font-semibold">
                    Rs {p.amount} · {p.method} <Badge>{p.status}</Badge>
                  </p>
                  {p.items?.length > 0 && <p className="text-ink-muted">{p.items.map((i) => `${i.label} Rs ${i.amount}`).join(' + ')}{p.discount ? ` − Rs ${p.discount}` : ''}</p>}
                  {p.transaction_id && <p>TID {p.transaction_id}</p>}
                  {p.screenshot_path && (
                    <a href={`/api/files/payment-screenshots/${p.screenshot_path}`} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/files/payment-screenshots/${p.screenshot_path}`} alt="Payment screenshot" className="mt-1 max-h-48 rounded border border-line" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
