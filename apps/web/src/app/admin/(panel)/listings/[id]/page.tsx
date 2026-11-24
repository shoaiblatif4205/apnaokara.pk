import Link from 'next/link';
import { notFound } from 'next/navigation';
import { whatsappPostText } from '@apna-okara/shared';
import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { Badge, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { CopyButton } from '@/components/admin/CopyButton';
import { statusBadge } from '@/components/admin/status';
import { REVIEW_SELECT, ReviewItem, type ReviewRow } from '@/components/admin/ReviewItem';
import { setVerified } from '../../reviews/actions';
import { RECEIPT_COLS, RECEIPT_JOIN, ReceiptCheck, type ReceiptCols } from '@/components/admin/ReceiptCheck';
import {
  approveListing,
  blockPhone,
  editListing,
  extendListing,
  giveFree,
  markSoldAdmin,
  makeFeatured,
  rejectListing,
  removeListing,
} from '../actions';

export const metadata = { title: 'Ad' };

type Ad = {
  id: string;
  reference: string;
  model: string;
  slug: string;
  title: string;
  description: string;
  price: number | null;
  price_type: string;
  custom_fields: Record<string, string | number | boolean>;
  seller_name: string;
  seller_phone: string;
  whatsapp_phone: string | null;
  show_phone: boolean;
  duration_days: number;
  is_free: boolean;
  is_featured: boolean;
  featured_until: string | null;
  featured_requested: boolean;
  boost_requested: boolean;
  boost_done_at: string | null;
  is_verified: boolean;
  rating_avg: string;
  rating_count: number;
  status: string;
  reject_reason: string | null;
  approved_at: string | null;
  expires_at: string | null;
  created_at: string;
  locale: string;
  category: string;
  subcategory: string | null;
  city: string;
  locality: string | null;
  approver: string | null;
  blocked: boolean;
  other_ads: number;
};

const pk = (s: string | null) => (s ? new Date(s).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : '-');

export default async function ListingDetail(props: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const ad = await q1<Ad>(
    `select l.*, c.name_en as category, s.name_en as subcategory, ci.name_en as city, lo.name_en as locality,
            a.full_name as approver,
            exists (select 1 from blocked_phones b where b.phone = l.seller_phone) as blocked,
            (select count(*)::int from listings o where o.seller_phone = l.seller_phone and o.id <> l.id) as other_ads
       from listings l
       join categories c on c.id = l.category_id
       left join categories s on s.id = l.subcategory_id
       join cities ci on ci.id = l.city_id
       left join localities lo on lo.id = l.locality_id
       left join admin_users a on a.id = l.approved_by
      where l.id = $1`,
    [params.id],
  );
  if (!ad) notFound();

  const [images, payments, hist, fieldDefs] = await Promise.all([
    q<{ storage_path: string; is_cover: boolean; deleted_at: string | null }>(
      'select storage_path, is_cover, deleted_at from listing_images where listing_id = $1 order by sort_order',
      [ad.id],
    ),
    q<{ id: string; purpose: string; amount: number; method: string; transaction_id: string | null; paid_from: string | null;
        screenshot_path: string | null; status: string; created_at: string; dup: number } & ReceiptCols>(
      `select p.id, p.purpose, p.amount, p.method, p.transaction_id, p.paid_from, p.screenshot_path, p.status, p.created_at, ${RECEIPT_COLS},
              (select count(*)::int from payments d where p.transaction_id is not null
                 and lower(d.transaction_id) = lower(p.transaction_id) and d.id <> p.id) as dup
         from payments p ${RECEIPT_JOIN} where p.listing_id = $1 order by p.created_at desc`,
      [ad.id],
    ),
    q<{ event: string; details: Record<string, unknown>; created_at: string; admin_name: string | null }>(
      `select h.event, h.details, h.created_at, a.full_name as admin_name
         from listing_history h left join admin_users a on a.id = h.admin_id
        where h.listing_id = $1 order by h.id desc`,
      [ad.id],
    ),
    q<{ key: string; label_en: string }>(
      'select f.key, f.label_en from category_fields f join listings l on l.category_id = f.category_id where l.id = $1',
      [ad.id],
    ),
  ]);

  const provider = ad.model === 'services' || ad.model === 'business';
  const [reviews, reports] = await Promise.all([
    provider ? q<ReviewRow>(`${REVIEW_SELECT} where r.listing_id = $1 order by r.created_at desc`, [ad.id]) : Promise.resolve([] as ReviewRow[]),
    q<{ id: number; reason: string; details: string | null; status: string; created_at: string }>(
      'select id, reason, details, status, created_at from reports where listing_id = $1 order by created_at desc',
      [ad.id],
    ),
  ]);
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://apnaokara.pk';
  const waText = whatsappPostText({
    title: ad.title,
    price: ad.price,
    priceType: ad.price_type,
    city: ad.locality ? `${ad.locality}, ${ad.city}` : ad.city,
    reference: ad.reference,
    url: `${site}/en/ad/${ad.slug}-${ad.reference}`,
  });
  const live = ad.status === 'approved' && (!ad.expires_at || new Date(ad.expires_at) > new Date());
  const labelFor = (k: string) => fieldDefs.find((f) => f.key === k)?.label_en ?? k;
  const priceText = ad.price ? `Rs ${ad.price.toLocaleString('en-PK')}` : ad.price_type === 'free' ? 'Free' : 'Contact for price';

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/listings" className="text-brand hover:underline">
          ← All listings
        </Link>
      </p>
      <PageHeader
        title={ad.title}
        description={`${ad.reference} · ${ad.category}${ad.subcategory ? ` › ${ad.subcategory}` : ''} · ${ad.city}${ad.locality ? `, ${ad.locality}` : ''}`}
        actions={<div className="flex items-center gap-2">{statusBadge(ad.status, ad.expires_at)}</div>}
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      {/* ---------- Actions ---------- */}
      <Section title="Actions">
        <div className="flex flex-wrap items-start gap-3">
          {ad.status === 'pending' && (
            <form action={approveListing}>
              <input type="hidden" name="id" value={ad.id} />
              <SubmitButton className="btn-primary">Approve and make live</SubmitButton>
            </form>
          )}
          {(ad.status === 'approved' || ad.status === 'expired') && (
            <form action={extendListing} className="flex items-end gap-2">
              <input type="hidden" name="id" value={ad.id} />
              <Field label="Add days" htmlFor="days">
                <input id="days" name="days" type="number" min={1} max={365} defaultValue={7} className="admin-input w-24" />
              </Field>
              <SubmitButton className="btn-sm border border-line bg-white hover:border-brand">{live ? 'Extend' : 'Make live again'}</SubmitButton>
            </form>
          )}
          {payments.some((p) => p.status === 'pending') && (
            <form action={giveFree}>
              <input type="hidden" name="id" value={ad.id} />
              <SubmitButton className="btn-sm border border-line bg-white hover:border-brand" confirm="Make this ad free (no payment needed)?">
                Give free
              </SubmitButton>
            </form>
          )}
          {(ad.status === 'approved' || ad.status === 'pending') && (
            <form action={markSoldAdmin}>
              <input type="hidden" name="id" value={ad.id} />
              <SubmitButton className="btn-sm border border-line bg-white" confirm="Mark this ad as sold?">
                Mark sold
              </SubmitButton>
            </form>
          )}
          <CopyButton text={waText} label="Copy WhatsApp post" />
          {(ad.status === 'approved' || ad.status === 'pending') && (
            <form action={makeFeatured} className="flex items-end gap-2">
              <input type="hidden" name="id" value={ad.id} />
              <Field label={ad.is_featured ? 'Featured days (0 = remove)' : 'Make Featured for days'} htmlFor="feat-days">
                <input id="feat-days" name="days" type="number" min={0} max={365} defaultValue={ad.is_featured ? 0 : ad.duration_days} className="admin-input w-24" />
              </Field>
              <SubmitButton className="btn-sm border border-line bg-white hover:border-brand">{ad.is_featured ? 'Update Featured' : 'Make Featured'}</SubmitButton>
            </form>
          )}
          {provider && (
            <form action={setVerified}>
              <input type="hidden" name="listing_id" value={ad.id} />
              <input type="hidden" name="verified" value={ad.is_verified ? 'false' : 'true'} />
              <SubmitButton
                className={ad.is_verified ? 'btn-sm border border-line bg-white' : 'btn-sm bg-brand text-white hover:bg-brand-dark'}
                confirm={ad.is_verified ? 'Remove the Verified badge?' : 'Give the Verified badge? Only after you have checked this provider (phone call, CNIC, shop visit).'}
              >
                {ad.is_verified ? 'Remove Verified badge' : 'Give Verified badge'}
              </SubmitButton>
            </form>
          )}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {ad.status === 'pending' && (
            <form action={rejectListing} className="rounded-lg border border-red-100 p-3">
              <input type="hidden" name="id" value={ad.id} />
              <Field label="Reject: reason (seller sees this)" htmlFor="reject-reason">
                <input id="reject-reason" name="reason" className="admin-input" placeholder="e.g. Photos are not clear" required minLength={3} />
              </Field>
              <div className="mt-2">
                <SubmitButton className="btn-danger" confirm="Reject this ad?">
                  Reject
                </SubmitButton>
              </div>
            </form>
          )}
          {ad.status !== 'removed' && ad.status !== 'pending' && (
            <form action={removeListing} className="rounded-lg border border-red-100 p-3">
              <input type="hidden" name="id" value={ad.id} />
              <Field label="Remove from site: reason" htmlFor="remove-reason">
                <input id="remove-reason" name="reason" className="admin-input" placeholder="e.g. Fraud report" required minLength={3} />
              </Field>
              <div className="mt-2">
                <SubmitButton className="btn-danger" confirm="Remove this ad from the site? It stays in records.">
                  Remove
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div>
          {/* ---------- Photos ---------- */}
          <Section title={`Photos (${images.length})`}>
            {images.length ? (
              <ul className="grid grid-cols-3 gap-2 md:grid-cols-4">
                {images.map((i) => (
                  <li key={i.storage_path} className="relative">
                    <a href={`/api/files/listing-images/${i.storage_path}`} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/files/listing-images/${i.storage_path}`} alt="" className="aspect-square w-full rounded-lg object-cover" />
                    </a>
                    {i.is_cover && <span className="absolute start-1 top-1 rounded bg-brand px-2 text-xs text-white">Cover</span>}
                    {i.deleted_at && <span className="absolute bottom-1 start-1 rounded bg-white px-2 text-xs">Removed after expiry</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">No photos.</p>
            )}
          </Section>

          {/* ---------- Details / edit ---------- */}
          <Section title="Details" description="You can fix the title, description and price. The old text is kept in the history.">
            <dl className="mb-4 grid gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="admin-label">Price</dt>
                <dd>{priceText} ({ad.price_type})</dd>
              </div>
              <div>
                <dt className="admin-label">Language used</dt>
                <dd>{ad.locale === 'ur' ? 'Urdu' : 'English'}</dd>
              </div>
              {Object.entries(ad.custom_fields ?? {}).map(([k, v]) => (
                <div key={k}>
                  <dt className="admin-label">{labelFor(k)}</dt>
                  <dd>{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</dd>
                </div>
              ))}
            </dl>
            <form action={editListing} className="grid gap-3">
              <input type="hidden" name="id" value={ad.id} />
              <Field label="Title" htmlFor="title">
                <input id="title" name="title" defaultValue={ad.title} className="admin-input" required />
              </Field>
              <Field label="Description" htmlFor="description">
                <textarea id="description" name="description" rows={6} defaultValue={ad.description} className="admin-input" />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Price type" htmlFor="price_type">
                  <select id="price_type" name="price_type" defaultValue={ad.price_type} className="admin-input">
                    <option value="fixed">Fixed</option>
                    <option value="negotiable">Negotiable</option>
                    <option value="contact">Contact for price</option>
                    <option value="free">Free</option>
                  </select>
                </Field>
                <Field label="Price (Rs)" htmlFor="price">
                  <input id="price" name="price" type="number" min={1} defaultValue={ad.price ?? ''} className="admin-input" />
                </Field>
              </div>
              <div>
                <SubmitButton className="btn-sm border border-line bg-white hover:border-brand">Save changes</SubmitButton>
              </div>
            </form>
          </Section>

          {provider && (
            <Section title={`Reviews (${reviews.length}) · ${Number(ad.rating_avg).toFixed(1)} ★`} description="Hidden reviews do not count in the rating.">
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <ReviewItem key={r.id} r={r} back={`/admin/listings/${ad.id}`} showAd={false} />
                ))}
                {!reviews.length && <li className="text-sm text-ink-muted">No reviews yet.</li>}
              </ul>
            </Section>
          )}

          {reports.length > 0 && (
            <Section title={`Reports (${reports.length})`}>
              <ul className="space-y-2 text-sm">
                {reports.map((r) => (
                  <li key={r.id} className="rounded-lg border border-line p-2">
                    <Badge tone={r.status === 'open' ? 'orange' : 'gray'}>{r.status}</Badge> <span className="font-semibold">{r.reason}</span>
                    {r.details ? ` · “${r.details}”` : ''} <span className="text-xs text-ink-muted">· {pk(r.created_at)}</span>
                  </li>
                ))}
              </ul>
              <Link href="/admin/reports" className="mt-2 inline-block text-sm text-brand hover:underline">
                Open Reports page
              </Link>
            </Section>
          )}

          {/* ---------- History ---------- */}
          <Section title="History">
            <ol className="space-y-2 text-sm">
              {hist.map((h, i) => (
                <li key={i} className="rounded-lg border border-line p-2">
                  <span className="font-semibold">{h.event.replace(/_/g, ' ')}</span>
                  <span className="text-ink-muted">
                    {' '}
                    · {pk(h.created_at)} · {h.admin_name ?? 'Seller / system'}
                  </span>
                  {h.event === 'edit_requested' && typeof h.details?.message === 'string' && (
                    <p className="mt-1 rounded bg-accent-light p-2">“{h.details.message}”</p>
                  )}
                  {h.event !== 'edit_requested' && Object.keys(h.details ?? {}).length > 0 && (
                    <p className="mt-1 truncate text-xs text-ink-muted">{JSON.stringify(h.details)}</p>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div>
          {/* ---------- Seller ---------- */}
          <Section title="Seller">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="admin-label">Name</dt>
                <dd>{ad.seller_name}</dd>
              </div>
              <div>
                <dt className="admin-label">Phone</dt>
                <dd>
                  <a href={`tel:${ad.seller_phone}`} className="text-brand hover:underline">
                    {ad.seller_phone}
                  </a>{' '}
                  {!ad.show_phone && <Badge>Hidden on ad</Badge>} {ad.blocked && <Badge tone="red">Blocked</Badge>}
                </dd>
              </div>
              <div>
                <dt className="admin-label">WhatsApp</dt>
                <dd>{ad.whatsapp_phone ?? '-'}</dd>
              </div>
              <div>
                <dt className="admin-label">Other ads by this number</dt>
                <dd>
                  <Link href={`/admin/listings?tab=all&q=${ad.seller_phone}`} className="text-brand hover:underline">
                    {ad.other_ads} other ad(s)
                  </Link>
                </dd>
              </div>
            </dl>
            {!ad.blocked && (
              <form action={blockPhone} className="mt-4">
                <input type="hidden" name="id" value={ad.id} />
                <input type="hidden" name="phone" value={ad.seller_phone} />
                <input type="hidden" name="reason" value={`Blocked from ad ${ad.reference}`} />
                <SubmitButton className="btn-danger" confirm="Block this phone number from posting ads?">
                  Block this number
                </SubmitButton>
              </form>
            )}
          </Section>

          {/* ---------- Plan ---------- */}
          <Section title="Plan">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="admin-label">Duration</dt>
                <dd>
                  {ad.duration_days} days {ad.is_free && <Badge tone="green">Free</Badge>}
                </dd>
              </div>
              <div>
                <dt className="admin-label">Add-ons</dt>
                <dd className="flex flex-wrap gap-1">
                  {ad.is_featured ? (
                    <Badge tone="orange">Featured{ad.featured_until ? ` until ${new Date(ad.featured_until).toLocaleDateString('en-PK')}` : ''}</Badge>
                  ) : ad.featured_requested ? (
                    <Badge>Featured paid, starts on approval</Badge>
                  ) : null}
                  {ad.boost_requested && (ad.boost_done_at ? <Badge tone="green">Boost posted</Badge> : <Badge tone="orange">Boost waiting</Badge>)}
                  {!ad.is_featured && !ad.featured_requested && !ad.boost_requested && <span>-</span>}
                </dd>
              </div>
              <div>
                <dt className="admin-label">Posted</dt>
                <dd>{pk(ad.created_at)}</dd>
              </div>
              <div>
                <dt className="admin-label">Approved</dt>
                <dd>
                  {pk(ad.approved_at)}
                  {ad.approver ? ` by ${ad.approver}` : ''}
                </dd>
              </div>
              <div>
                <dt className="admin-label">Expires</dt>
                <dd>{pk(ad.expires_at)}</dd>
              </div>
              {ad.reject_reason && (
                <div>
                  <dt className="admin-label">Reason</dt>
                  <dd className="text-red-800">{ad.reject_reason}</dd>
                </div>
              )}
            </dl>
          </Section>

          {/* ---------- Payments ---------- */}
          <Section title={`Payments (${payments.length})`}>
            <ul className="space-y-3 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="rounded-lg border border-line p-3">
                  <p className="font-semibold">
                    {p.purpose} · {p.method === 'free' ? 'Free' : `Rs ${p.amount}`}{' '}
                    <Badge tone={p.status === 'verified' || p.status === 'free' ? 'green' : p.status === 'rejected' ? 'red' : 'orange'}>{p.status}</Badge>
                  </p>
                  {p.method !== 'free' && (
                    <>
                      <p>Method: {p.method}</p>
                      <p>
                        Transaction ID: <span dir="ltr">{p.transaction_id}</span>{' '}
                        {p.dup > 0 && <Badge tone="red">Used {p.dup} time(s) before!</Badge>}
                      </p>
                      {p.paid_from && <p>Paid from: {p.paid_from}</p>}
                      <ReceiptCheck r={p} amount={p.amount} createdAt={p.created_at} />
                      {p.screenshot_path && (
                        <a href={`/api/files/payment-screenshots/${p.screenshot_path}`} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/files/payment-screenshots/${p.screenshot_path}`}
                            alt="Payment screenshot"
                            className="mt-2 max-h-72 rounded-lg border border-line"
                          />
                        </a>
                      )}
                    </>
                  )}
                  <p className="mt-1 text-xs text-ink-muted">{pk(p.created_at)}</p>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
