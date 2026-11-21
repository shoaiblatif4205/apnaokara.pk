import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { BANNER_PLACEMENTS, PLACEMENT_INFO, type Placement } from '@/lib/bannerConfig';
import { Badge, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { createBrandBanner } from './actions';

export const metadata = { title: 'Banners' };

const TABS = ['pending', 'scheduled', 'running', 'paused', 'expired', 'rejected'] as const;

type Row = {
  id: string; business_name: string | null; placement: string; status: string; starts_at: string | null; ends_at: string | null; days: number | null;
  price: number | null; is_free: boolean; needs_design: boolean; image_desktop_path: string | null; views: number; clicks: number; pay_status: string | null;
};

export default async function BannersPage(props: { searchParams: Promise<{ tab?: string; saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  const tab = (TABS as readonly string[]).includes(searchParams.tab ?? '') ? searchParams.tab! : 'pending';
  const [rows, counts] = await Promise.all([
    q<Row>(
      `select b.id, b.business_name, b.placement, b.status::text, b.starts_at, b.ends_at, b.days, b.price, b.is_free, b.needs_design, b.image_desktop_path,
              coalesce(s.views, 0)::int as views, coalesce(s.clicks, 0)::int as clicks,
              (select status::text from payments p where p.banner_id = b.id order by created_at desc limit 1) as pay_status
         from banners b
         left join (select banner_id, sum(views) as views, sum(clicks) as clicks from banner_stats group by banner_id) s on s.banner_id = b.id
        where b.owner_type = 'brand' and b.status = $1::banner_status
        order by b.created_at ${tab === 'pending' ? 'asc' : 'desc'} limit 200`,
      [tab],
    ),
    q<{ status: string; n: number }>(`select status::text, count(*)::int as n from banners where owner_type = 'brand' group by status`),
  ]);
  const pk = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' }) : '-');

  return (
    <>
      <PageHeader
        title="Brand banners"
        description="Banners booked by brands from the Advertise page or by phone. Our own banners and hero slides are in Homepage. Prices are in Pricing."
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      <nav className="mb-4 flex flex-wrap gap-1">
        {TABS.map((k) => (
          <Link key={k} href={`/admin/banners?tab=${k}`} className={`btn-sm border capitalize ${tab === k ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>
            {k} ({counts.find((c) => c.status === k)?.n ?? 0})
          </Link>
        ))}
      </nav>
      <Section title={`${rows.length} banner(s)`}>
        <ul className="space-y-3">
          {rows.map((b) => (
            <li key={b.id}>
              <Link href={`/admin/banners/${b.id}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3 text-sm hover:border-brand">
                {b.image_desktop_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/banners/${b.image_desktop_path}`} alt="" className="h-14 w-28 rounded object-cover" />
                ) : (
                  <span className="flex h-14 w-28 items-center justify-center rounded bg-page text-xs text-ink-muted">No image</span>
                )}
                <span className="flex-1">
                  <span className="block font-semibold">{b.business_name ?? 'Brand'}</span>
                  <span className="text-ink-muted">
                    {PLACEMENT_INFO[b.placement as Placement]?.en ?? b.placement} · {b.days ?? '-'} days · {pk(b.starts_at)} – {pk(b.ends_at)}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1">
                  {b.is_free ? <Badge tone="green">Free</Badge> : <Badge>Rs {(b.price ?? 0).toLocaleString('en-PK')} · {b.pay_status ?? '-'}</Badge>}
                  {b.needs_design && <Badge tone="orange">Design needed</Badge>}
                  <Badge>
                    {b.views} views · {b.clicks} clicks
                  </Badge>
                </span>
              </Link>
            </li>
          ))}
          {!rows.length && <li className="text-ink-muted">Nothing here.</li>}
        </ul>
      </Section>

      <Section title="Add a banner booked by phone / WhatsApp" description="Creates a pending banner. Open it to upload the image and approve.">
        <form action={createBrandBanner} className="grid items-end gap-3 md:grid-cols-4">
          <Field label="Business name" htmlFor="nb-name">
            <input id="nb-name" name="business_name" className="admin-input" required />
          </Field>
          <Field label="Phone" htmlFor="nb-phone">
            <input id="nb-phone" name="contact_phone" className="admin-input" />
          </Field>
          <Field label="Place" htmlFor="nb-place">
            <select id="nb-place" name="placement" className="admin-input">
              {BANNER_PLACEMENTS.map((p) => (
                <option key={p} value={p}>
                  {PLACEMENT_INFO[p].en}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Days" htmlFor="nb-days">
            <input id="nb-days" name="days" type="number" min={1} defaultValue={7} className="admin-input" />
          </Field>
          <Field label="Start" htmlFor="nb-start">
            <input id="nb-start" name="starts_at" type="datetime-local" className="admin-input" />
          </Field>
          <Field label="Amount received (Rs, 0 = free)" htmlFor="nb-amount">
            <input id="nb-amount" name="amount" type="number" min={0} defaultValue={0} className="admin-input" />
          </Field>
          <Field label="Method" htmlFor="nb-method">
            <select id="nb-method" name="method" className="admin-input">
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">Easypaisa</option>
              <option value="nayapay">NayaPay</option>
              <option value="bank">Bank</option>
            </select>
          </Field>
          <Field label="Transaction ID" htmlFor="nb-tid">
            <input id="nb-tid" name="transaction_id" className="admin-input" />
          </Field>
          <div className="md:col-span-4">
            <SubmitButton>Create banner</SubmitButton>
          </div>
        </form>
      </Section>
    </>
  );
}
