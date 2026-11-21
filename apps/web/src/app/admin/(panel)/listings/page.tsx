import Link from 'next/link';
import { models } from '@apna-okara/shared';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { runExpiryIfDue } from '@/lib/expiry';
import { Badge, PageHeader, Section } from '@/components/admin/ui';
import { statusBadge } from '@/components/admin/status';

export const metadata = { title: 'Listings' };

const TABS = [
  ['pending', 'Pending'],
  ['live', 'Live'],
  ['expired', 'Expired'],
  ['rejected', 'Rejected'],
  ['removed', 'Removed'],
  ['sold', 'Sold'],
  ['all', 'All'],
] as const;

type Row = {
  id: string;
  reference: string;
  title: string;
  model: string;
  status: string;
  category: string;
  city: string;
  seller_name: string;
  seller_phone: string;
  duration_days: number;
  is_free: boolean;
  created_at: string;
  expires_at: string | null;
  cover: string | null;
  payment_status: string | null;
  amount: number | null;
  edit_requests: number;
};

const PAGE = 50;

export default async function ListingsPage(props: {
  searchParams: Promise<{ tab?: string; q?: string; model?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  await runExpiryIfDue();
  const tab = TABS.some(([k]) => k === searchParams.tab) ? searchParams.tab! : 'pending';
  const search = (searchParams.q ?? '').trim();
  const model = models.some((m) => m.key === searchParams.model) ? searchParams.model! : '';
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1);
  const digits = search.replace(/\D/g, '');
  const phoneSearch = digits.length >= 7 ? (digits.startsWith('92') ? '0' + digits.slice(2) : digits) : '';

  const statusWhere: Record<string, string> = {
    pending: `l.status = 'pending'`,
    live: `l.status = 'approved' and (l.expires_at is null or l.expires_at > now())`,
    expired: `(l.status = 'expired' or (l.status = 'approved' and l.expires_at <= now()))`,
    rejected: `l.status = 'rejected'`,
    removed: `l.status = 'removed'`,
    sold: `l.status = 'sold'`,
    all: 'true',
  };

  const where = `${statusWhere[tab]}
    and ($1 = '' or l.reference ilike $1 or l.title ilike '%' || $1 || '%' or l.seller_name ilike '%' || $1 || '%'
         or ($2 <> '' and (l.seller_phone like '%' || $2 || '%' or l.whatsapp_phone like '%' || $2 || '%')))
    and ($3 = '' or l.model::text = $3)`;

  const rows = await q<Row>(
    `select l.id, l.reference, l.title, l.model, l.status, c.name_en as category, ci.name_en as city,
            l.seller_name, l.seller_phone, l.duration_days, l.is_free, l.created_at, l.expires_at,
            (select storage_path from listing_images i where i.listing_id = l.id and i.is_cover limit 1) as cover,
            p.status as payment_status, p.amount,
            (select count(*)::int from listing_history h where h.listing_id = l.id and h.event = 'edit_requested'
               and h.created_at > coalesce((select max(h2.created_at) from listing_history h2
                 where h2.listing_id = l.id and h2.event = 'edited_by_admin'), '-infinity')) as edit_requests
       from listings l
       join categories c on c.id = l.category_id
       join cities ci on ci.id = l.city_id
       left join lateral (select status, amount from payments where listing_id = l.id order by created_at desc limit 1) p on true
      where ${where}
      order by ${tab === 'pending' ? 'l.created_at asc' : 'l.created_at desc'}
      limit $4 offset $5`,
    [search, phoneSearch, model, PAGE + 1, (page - 1) * PAGE],
  );
  const counts = await q<{ tab: string; n: number }>(
    `select 'pending' as tab, count(*)::int as n from listings l where ${statusWhere.pending}
     union all select 'live', count(*)::int from listings l where ${statusWhere.live}
     union all select 'expired', count(*)::int from listings l where ${statusWhere.expired}`,
  );
  const count = (k: string) => counts.find((c) => c.tab === k)?.n;
  const qs = (extra: Record<string, string>) =>
    new URLSearchParams({ tab, q: search, model, ...extra }).toString();

  return (
    <>
      <PageHeader title="Listings" description="All ads, service providers and businesses. Pending ads are shown oldest first. Nothing is ever deleted." />

      <nav className="mb-4 flex flex-wrap gap-1" aria-label="Status">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/listings?${new URLSearchParams({ tab: k, q: search, model }).toString()}`}
            aria-current={tab === k ? 'page' : undefined}
            className={`btn-sm border ${tab === k ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}
          >
            {label}
            {count(k) !== undefined ? ` (${count(k)})` : ''}
          </Link>
        ))}
      </nav>

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input type="hidden" name="tab" value={tab} />
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <input id="q" name="q" defaultValue={search} placeholder="Reference, phone number, title or name" className="admin-input max-w-sm" />
        <label htmlFor="model" className="sr-only">
          Model
        </label>
        <select id="model" name="model" defaultValue={model} className="admin-input max-w-[200px]">
          <option value="">All models</option>
          {models.map((m) => (
            <option key={m.key} value={m.key}>
              {m.name.en}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-sm border border-line bg-white">
          Search
        </button>
      </form>

      <Section title={`${rows.length > PAGE ? `${PAGE}+` : rows.length} result(s)`}>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Seller</th>
                <th>Plan</th>
                <th>Payment</th>
                <th>Posted</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, PAGE).map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/listings/${r.id}`} className="flex items-center gap-3 hover:text-brand">
                      {r.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/files/listing-images/${r.cover}`} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                      ) : (
                        <span className="h-12 w-12 shrink-0 rounded bg-page" />
                      )}
                      <span>
                        <span className="block font-semibold">{r.title}</span>
                        <span className="block text-xs text-ink-muted">
                          {r.reference} · {r.category} · {r.city}
                        </span>
                        {r.edit_requests > 0 && <Badge tone="orange">Change requested</Badge>}
                      </span>
                    </Link>
                  </td>
                  <td>
                    {r.seller_name}
                    <span className="block text-xs text-ink-muted">{r.seller_phone}</span>
                  </td>
                  <td>{r.duration_days} days</td>
                  <td>
                    {r.is_free || r.payment_status === 'free' ? (
                      <Badge tone="green">Free</Badge>
                    ) : (
                      <>
                        Rs {r.amount ?? 0}{' '}
                        <Badge tone={r.payment_status === 'verified' ? 'green' : r.payment_status === 'rejected' ? 'red' : 'orange'}>
                          {r.payment_status ?? '-'}
                        </Badge>
                      </>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}</td>
                  <td>{statusBadge(r.status, r.expires_at)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="text-ink-muted">
                    No ads here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex gap-2">
          {page > 1 && (
            <Link className="btn-sm border border-line bg-white" href={`/admin/listings?${qs({ page: String(page - 1) })}`}>
              Previous
            </Link>
          )}
          {rows.length > PAGE && (
            <Link className="btn-sm border border-line bg-white" href={`/admin/listings?${qs({ page: String(page + 1) })}`}>
              Next
            </Link>
          )}
        </div>
      </Section>
    </>
  );
}
