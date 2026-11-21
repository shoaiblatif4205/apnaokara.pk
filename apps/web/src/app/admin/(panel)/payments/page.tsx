import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { PAYMENTS_FROM, paymentsWhere, readPaymentFilters } from '@/lib/admin/paymentsQuery';
import { Badge, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { rejectPayment, verifyPayment } from './actions';

export const metadata = { title: 'Payments' };

const PURPOSE: Record<string, string> = {
  listing: 'New ad',
  renewal: 'Renewal',
  featured: 'Featured upgrade',
  whatsapp_boost: 'WhatsApp Boost',
  banner: 'Banner',
  rishta: 'Rishta',
};

type Row = {
  id: string; purpose: string; amount: number; subtotal: number | null; discount: number; method: string; transaction_id: string | null;
  paid_from: string | null; screenshot_path: string | null; status: string; reject_reason: string | null; created_at: string;
  items: { key: string; label: string; amount: number }[]; listing_id: string | null; reference: string | null; title: string | null;
  listing_status: string | null; banner_id: string | null; business_name: string | null; verifier: string | null; promo: string | null; dup: number;
  rishta_id: string | null;
};

export default async function PaymentsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  const f = readPaymentFilters(searchParams);
  const { sql, params } = paymentsWhere(f);
  const [rows, totals, byPurpose] = await Promise.all([
    q<Row>(
      `select p.id, p.purpose, p.amount, p.subtotal, p.discount, p.method::text, p.transaction_id, p.paid_from, p.screenshot_path, p.status::text,
              p.reject_reason, p.created_at, p.items, l.id as listing_id, l.reference, l.title, l.status::text as listing_status,
              b.id as banner_id, b.business_name, a.full_name as verifier, pc.code as promo, p.rishta_profile_id as rishta_id,
              (select count(*)::int from payments d where p.transaction_id is not null and lower(d.transaction_id) = lower(p.transaction_id) and d.id <> p.id) as dup
         ${PAYMENTS_FROM} ${sql} order by p.created_at ${f.tab === 'pending' ? 'asc' : 'desc'} limit 200`,
      params,
    ),
    q<{ status: string; n: number; total: number }>(
      `select p.status::text, count(*)::int as n, coalesce(sum(p.amount), 0)::int as total ${PAYMENTS_FROM}
        ${paymentsWhere({ ...f, tab: 'all' }).sql} group by p.status`,
      paymentsWhere({ ...f, tab: 'all' }).params,
    ),
    q<{ purpose: string; total: number }>(
      `select p.purpose, coalesce(sum(p.amount), 0)::int as total ${PAYMENTS_FROM}
        ${paymentsWhere({ ...f, tab: 'verified' }).sql} group by p.purpose order by total desc`,
      paymentsWhere({ ...f, tab: 'verified' }).params,
    ),
  ]);
  const t = (s: string) => totals.find((x) => x.status === s);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  const tabLink = (tab: string) => `/admin/payments?${new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), tab }).toString()}`;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every payment is kept forever. Ad payments are accepted by approving the ad; Featured, Boost and banner payments are accepted here and switch on at once."
        actions={
          <a href={`/admin/payments/export?${qs}`} className="btn-sm border border-line bg-white hover:border-brand">
            Download Excel (CSV)
          </a>
        }
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      <details className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" open>
        <summary className="cursor-pointer font-bold">Before you verify any payment (stops fake payments)</summary>
        <ol className="mt-2 list-decimal space-y-1 ps-5">
          <li>Open <b>your own</b> JazzCash / Easypaisa / bank app (never trust the screenshot alone; screenshots can be edited).</li>
          <li>Find a payment <b>received</b> with this exact <b>transaction ID</b> and the <b>exact amount</b>.</li>
          <li>Check the date: it must be from the last few days.</li>
          <li>If you cannot find it in your account, <b>reject</b> it with the reason “Payment not received”.</li>
        </ol>
        <p className="mt-2">The site already blocks: a transaction ID used before, the same screenshot used twice, and IDs that do not look real.</p>
      </details>

      <ul className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Verified (received)', 'verified', 'green'],
          ['Pending', 'pending', 'orange'],
          ['Rejected', 'rejected', 'red'],
          ['Free', 'free', 'gray'],
        ].map(([label, s]) => (
          <li key={s} className="card p-4">
            <p className="text-xs font-semibold uppercase text-ink-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold">Rs {(t(s)?.total ?? 0).toLocaleString('en-PK')}</p>
            <p className="text-xs text-ink-muted">{t(s)?.n ?? 0} payment(s)</p>
          </li>
        ))}
      </ul>
      {byPurpose.length > 0 && (
        <p className="mb-4 text-sm text-ink-muted">
          Received by type: {byPurpose.map((b) => `${PURPOSE[b.purpose] ?? b.purpose} Rs ${b.total.toLocaleString('en-PK')}`).join(' · ')}
        </p>
      )}

      <nav className="mb-3 flex flex-wrap gap-1">
        {['pending', 'verified', 'rejected', 'free', 'all'].map((k) => (
          <Link key={k} href={tabLink(k)} className={`btn-sm border capitalize ${f.tab === k ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>
            {k}
          </Link>
        ))}
      </nav>

      <form className="card mb-4 grid gap-3 p-3 md:grid-cols-6" role="search">
        <input type="hidden" name="tab" value={f.tab} />
        <Field label="Search" htmlFor="pq">
          <input id="pq" name="q" defaultValue={f.q} placeholder="TID, AO-…, phone" className="admin-input" />
        </Field>
        <Field label="Type" htmlFor="pp">
          <select id="pp" name="purpose" defaultValue={f.purpose} className="admin-input">
            <option value="">All</option>
            {Object.entries(PURPOSE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Method" htmlFor="pm">
          <select id="pm" name="method" defaultValue={f.method} className="admin-input">
            <option value="">All</option>
            <option value="jazzcash">JazzCash</option>
            <option value="easypaisa">Easypaisa</option>
            <option value="nayapay">NayaPay</option>
            <option value="bank">Bank</option>
            <option value="free">Free</option>
          </select>
        </Field>
        <Field label="From" htmlFor="pf">
          <input id="pf" name="from" type="date" defaultValue={f.from} className="admin-input" />
        </Field>
        <Field label="To" htmlFor="pt">
          <input id="pt" name="to" type="date" defaultValue={f.to} className="admin-input" />
        </Field>
        <div className="flex items-end">
          <button type="submit" className="btn-sm border border-line bg-white">
            Filter
          </button>
        </div>
      </form>

      <Section title={`${rows.length} payment(s)`}>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-3 rounded-lg border border-line p-3 text-sm md:grid-cols-[1fr_160px]">
              <div>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold">Rs {r.amount.toLocaleString('en-PK')}</span>
                  <Badge>{PURPOSE[r.purpose] ?? r.purpose}</Badge>
                  <Badge tone={r.status === 'verified' || r.status === 'free' ? 'green' : r.status === 'rejected' ? 'red' : 'orange'}>{r.status}</Badge>
                  {r.dup > 0 && <Badge tone="red">Transaction ID used {r.dup} time(s) before!</Badge>}
                </p>
                <p className="mt-1">
                  {r.method} · TID <span dir="ltr">{r.transaction_id ?? '-'}</span>
                  {r.paid_from ? ` · from ${r.paid_from}` : ''}
                </p>
                {r.items?.length > 0 && (
                  <p className="text-ink-muted">
                    {r.items.map((i) => `${i.label} Rs ${i.amount}`).join(' + ')}
                    {r.discount ? ` − discount Rs ${r.discount}${r.promo ? ` (${r.promo})` : ''}` : ''}
                  </p>
                )}
                <p className="mt-1">
                  {r.listing_id ? (
                    <Link href={`/admin/listings/${r.listing_id}`} className="text-brand hover:underline">
                      {r.reference} · {r.title} ({r.listing_status})
                    </Link>
                  ) : r.banner_id ? (
                    <Link href={`/admin/banners/${r.banner_id}`} className="text-brand hover:underline">
                      Banner · {r.business_name}
                    </Link>
                  ) : null}
                </p>
                <p className="text-xs text-ink-muted">
                  {new Date(r.created_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}
                  {r.verifier ? ` · by ${r.verifier}` : ''}
                  {r.reject_reason ? ` · ${r.reject_reason}` : ''}
                </p>
                {r.status === 'pending' && (r.purpose === 'listing' || r.purpose === 'renewal' || r.purpose === 'rishta') && (
                  <p className="mt-2 text-xs text-ink-muted">
                    {r.purpose === 'rishta' ? (
                      r.rishta_id ? <Link href={`/admin/rishta/${r.rishta_id}`} className="text-brand underline">Approve on the Rishta profile page</Link> : 'Approve on the Rishta page'
                    ) : (
                      'Approve or reject the ad on its page to accept this payment.'
                    )}
                  </p>
                )}
                {r.status === 'pending' && r.purpose !== 'listing' && r.purpose !== 'renewal' && r.purpose !== 'rishta' && (
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <form action={verifyPayment}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="qs" value={qs} />
                      <SubmitButton className="btn-sm bg-brand text-white hover:bg-brand-dark" confirm="Payment received? This switches the upgrade / banner on.">
                        Verify and switch on
                      </SubmitButton>
                    </form>
                    <form action={rejectPayment} className="flex items-end gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="qs" value={qs} />
                      <label htmlFor={`rr-${r.id}`} className="sr-only">
                        Reason
                      </label>
                      <input id={`rr-${r.id}`} name="reason" placeholder="Reason" className="admin-input w-48" />
                      <SubmitButton className="btn-danger">Reject</SubmitButton>
                    </form>
                  </div>
                )}
              </div>
              {r.screenshot_path && (
                <a href={`/api/files/payment-screenshots/${r.screenshot_path}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/files/payment-screenshots/${r.screenshot_path}`} alt="Payment screenshot" className="max-h-48 rounded-lg border border-line" />
                </a>
              )}
            </li>
          ))}
          {!rows.length && <li className="text-ink-muted">No payments here.</li>}
        </ul>
      </Section>
    </>
  );
}
