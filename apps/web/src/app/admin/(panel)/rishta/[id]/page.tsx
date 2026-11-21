import Link from 'next/link';
import { notFound } from 'next/navigation';
import { heightLabel, optionLabel, RISHTA_OPTIONS } from '@apna-okara/shared';
import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { Badge, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { approveRishta, blockAccount, extendRishta, rejectRishta, reviewPhoto, setPremium, showRishtaAgain } from '../actions';

export const metadata = { title: 'Rishta profile' };

const pk = (s: string | null) => (s ? new Date(s).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : '-');

export default async function RishtaDetail(props: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  await requireAdmin(['rishta_coordinator']);
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const p = await q1<Record<string, unknown> & {
    id: string; reference: string; status: string; gender: string; phone: string; is_blocked: boolean; expires_at: string | null; approved_at: string | null;
    is_premium: boolean; premium_until: string | null; reject_reason: string | null; looking_for: Record<string, unknown>; verifier: string | null;
    date_of_birth: string; age: number; city: string | null; locality: string | null; views: number; other_profiles: number;
  }>(
    `select p.*, p.status::text as status, to_char(p.date_of_birth, 'YYYY-MM-DD') as date_of_birth, date_part('year', age(p.date_of_birth))::int as age,
            a.phone, a.is_blocked, c.name_en as city, l.name_en as locality, ad.full_name as verifier,
            (select count(*)::int from rishta_profiles o where o.account_id = p.account_id and o.id <> p.id) as other_profiles
       from rishta_profiles p join rishta_accounts a on a.id = p.account_id left join cities c on c.id = p.native_city_id
       left join localities l on l.id = p.native_locality_id left join admin_users ad on ad.id = p.verified_by
      where p.id = $1`,
    [params.id],
  );
  if (!p) notFound();
  const [photos, payments, interests, reports] = await Promise.all([
    q<{ id: number; is_approved: boolean; is_rejected: boolean }>('select id, is_approved, is_rejected from rishta_photos where profile_id = $1 order by sort_order', [p.id]),
    q<{ id: string; amount: number; method: string; transaction_id: string | null; screenshot_path: string | null; status: string; items: { label: string; amount: number }[]; created_at: string }>(
      'select id, amount, method::text, transaction_id, screenshot_path, status::text, items, created_at from payments where rishta_profile_id = $1 order by created_at desc',
      [p.id],
    ),
    q<{ id: number; other: string; direction: string; status: string; created_at: string; mediation_status: string | null }>(
      `select i.id, o.reference as other, case when i.from_profile_id = $1 then 'sent' else 'received' end as direction, i.status::text, i.created_at, i.mediation_status
         from rishta_interests i join rishta_profiles o on o.id = case when i.from_profile_id = $1 then i.to_profile_id else i.from_profile_id end
        where i.from_profile_id = $1 or i.to_profile_id = $1 order by i.created_at desc limit 100`,
      [p.id],
    ),
    q<{ id: number; reason: string; status: string; created_at: string; by: string | null }>(
      `select r.id, r.reason, r.status, r.created_at, b.reference as by from rishta_reports r left join rishta_profiles b on b.id = r.reported_by
        where r.profile_id = $1 order by r.created_at desc`,
      [p.id],
    ),
  ]);
  const L = (k: keyof typeof RISHTA_OPTIONS, v: unknown) => optionLabel(RISHTA_OPTIONS[k], (v as string) ?? null, 'en');
  const s = (v: unknown) => (v === null || v === undefined || v === '' ? '-' : String(v));
  const details: [string, string][] = [
    ['Made by', L('createdBy', p.created_by)], ['Date of birth', `${p.date_of_birth} (${p.age})`], ['Height', heightLabel(p.height_cm as number)],
    ['Complexion', L('complexion', p.complexion)], ['Marital status', L('maritalStatus', p.marital_status)], ['Children', s(p.children)],
    ['Religion', L('religion', p.religion)], ['Sect', L('sect', p.sect)], ['Caste', s(p.caste)], ['Education', L('education', p.education)],
    ['Profession', s(p.profession)], ['Income', L('income', p.income_range)], ['Native', `${s(p.city)}${p.locality ? `, ${p.locality}` : ''}`],
    ['Living in', `${s(p.current_city)}, ${s(p.current_country)}`], ['House', L('houseType', p.house_type)], ['Father', s(p.father_profession)],
    ['Mother', s(p.mother_profession)], ['Brothers / sisters', `${s(p.brothers)} / ${s(p.sisters)} (married ${s(p.married_siblings)})`],
    ['Family type', L('familyType', p.family_type)], ['Profile views', s(p.views)],
  ];
  const pending = payments.some((x) => x.status === 'pending');

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/rishta" className="text-brand hover:underline">← All Rishta profiles</Link>
      </p>
      <PageHeader
        title={`${p.reference} · ${s(p.full_name)}`}
        description={`${p.gender === 'female' ? 'Girl' : 'Boy'}, ${p.age} · account ${p.phone}${p.other_profiles ? ` · ${p.other_profiles} other profile(s) on this account` : ''}`}
        actions={<Badge tone={p.status === 'approved' ? 'green' : p.status === 'pending' ? 'orange' : 'red'}>{p.status}</Badge>}
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      <Section title="Verify and decide" description="Call the guardian number below. Confirm the details and that the family made this profile.">
        <div className="mb-4 rounded-lg bg-page p-3 text-sm">
          <p className="font-semibold">Private contact (never shown to members until both say yes)</p>
          <p>
            Guardian: {s(p.guardian_name)} ·{' '}
            <a href={`tel:${s(p.guardian_phone)}`} className="font-semibold text-brand">{s(p.guardian_phone)}</a> · Account phone: {p.phone}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {(p.status === 'pending' || pending) && (
            <>
              <form action={approveRishta}>
                <input type="hidden" name="id" value={p.id} />
                <SubmitButton className="btn-primary" confirm="Called the family and payment received?">
                  {p.status === 'pending' ? 'Approve (verified by phone)' : 'Accept payment'}
                </SubmitButton>
              </form>
              <form action={approveRishta}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="free" value="true" />
                <SubmitButton className="btn-sm border border-line bg-white" confirm="Approve for free?">Approve free</SubmitButton>
              </form>
            </>
          )}
          {['approved', 'expired'].includes(p.status) && (
            <form action={extendRishta} className="flex items-end gap-2">
              <input type="hidden" name="id" value={p.id} />
              <Field label="Add days" htmlFor="xd"><input id="xd" name="days" type="number" min={1} max={365} defaultValue={30} className="admin-input w-24" /></Field>
              <SubmitButton className="btn-sm border border-line bg-white">Extend</SubmitButton>
            </form>
          )}
          <form action={setPremium} className="flex items-end gap-2">
            <input type="hidden" name="id" value={p.id} />
            <Field label={p.is_premium ? 'Premium days (0 = remove)' : 'Give Premium days'} htmlFor="pd">
              <input id="pd" name="days" type="number" min={0} max={365} defaultValue={p.is_premium ? 0 : 30} className="admin-input w-24" />
            </Field>
            <SubmitButton className="btn-sm border border-line bg-white">Premium</SubmitButton>
          </form>
          {p.status === 'hidden' && (
            <form action={showRishtaAgain}>
              <input type="hidden" name="id" value={p.id} />
              <SubmitButton className="btn-sm border border-line bg-white">Show again</SubmitButton>
            </form>
          )}
        </div>
        <form action={rejectRishta} className="mt-4 grid items-end gap-2 rounded-lg border border-red-100 p-3 md:grid-cols-[160px_1fr_auto]">
          <input type="hidden" name="id" value={p.id} />
          <Field label="Action" htmlFor="rto">
            <select id="rto" name="to" className="admin-input" defaultValue={p.status === 'pending' ? 'rejected' : 'hidden'}>
              <option value="rejected">Reject</option>
              <option value="hidden">Hide</option>
              <option value="removed">Remove</option>
            </select>
          </Field>
          <Field label="Reason (the family sees it)" htmlFor="rrs"><input id="rrs" name="reason" className="admin-input" /></Field>
          <SubmitButton className="btn-danger" confirm="Are you sure?">Apply</SubmitButton>
        </form>
        <form action={blockAccount} className="mt-3">
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="block" value={p.is_blocked ? 'false' : 'true'} />
          <SubmitButton className="btn-danger" confirm={p.is_blocked ? 'Unblock this account?' : 'Block this account? All its live profiles will be hidden.'}>
            {p.is_blocked ? 'Unblock account' : 'Block account'}
          </SubmitButton>
        </form>
        <p className="mt-3 text-xs text-ink-muted">
          Approved {pk(p.approved_at)}{p.verifier ? ` by ${p.verifier}` : ''} · Valid until {pk(p.expires_at)}
          {p.is_premium ? ` · Premium until ${pk(p.premium_until)}` : ''}
          {p.reject_reason ? ` · Reason: ${p.reject_reason}` : ''}
        </p>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div>
          <Section title={`Photos (${photos.filter((x) => !x.is_rejected).length})`} description="Approve only clear, decent photos of this person. Members see them blurred unless the family shares them.">
            <ul className="flex flex-wrap gap-3">
              {photos.map((ph) => (
                <li key={ph.id} className="w-40 text-sm">
                  <a href={`/api/rishta/photo/${ph.id}?v=clear`} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/rishta/photo/${ph.id}?v=clear`} alt="" className={`h-48 w-40 rounded-lg object-cover ${ph.is_rejected ? 'opacity-40' : ''}`} />
                  </a>
                  <p className="mt-1">{ph.is_approved ? <Badge tone="green">Approved</Badge> : ph.is_rejected ? <Badge tone="red">Rejected / removed</Badge> : <Badge tone="orange">Waiting</Badge>}</p>
                  <div className="mt-1 flex gap-1">
                    {!ph.is_approved && (
                      <form action={reviewPhoto}>
                        <input type="hidden" name="profile_id" value={p.id} />
                        <input type="hidden" name="photo_id" value={ph.id} />
                        <input type="hidden" name="approve" value="true" />
                        <SubmitButton className="btn-sm border border-line bg-white">Approve</SubmitButton>
                      </form>
                    )}
                    {!ph.is_rejected && (
                      <form action={reviewPhoto}>
                        <input type="hidden" name="profile_id" value={p.id} />
                        <input type="hidden" name="photo_id" value={ph.id} />
                        <input type="hidden" name="approve" value="false" />
                        <SubmitButton className="btn-danger">Reject</SubmitButton>
                      </form>
                    )}
                  </div>
                </li>
              ))}
              {!photos.length && <li className="text-ink-muted">No photos.</li>}
            </ul>
          </Section>
          <Section title="Details">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
              {details.map(([k, v]) => (
                <div key={k} className="border-b border-line pb-1">
                  <dt className="admin-label">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {p.about ? <p className="mt-4 whitespace-pre-line text-sm"><span className="font-semibold">About: </span>{s(p.about)}</p> : null}
            <p className="mt-2 text-sm"><span className="font-semibold">Looking for: </span>{JSON.stringify(p.looking_for)}</p>
          </Section>
        </div>
        <div>
          <Section title={`Payments (${payments.length})`}>
            <ul className="space-y-2 text-sm">
              {payments.map((y) => (
                <li key={y.id} className="rounded-lg border border-line p-2">
                  <p className="font-semibold">Rs {y.amount} · {y.method} <Badge>{y.status}</Badge></p>
                  {y.items?.length > 0 && <p className="text-ink-muted">{y.items.map((i) => `${i.label} Rs ${i.amount}`).join(' + ')}</p>}
                  {y.transaction_id && <p>TID {y.transaction_id}</p>}
                  {y.screenshot_path && (
                    <a href={`/api/files/payment-screenshots/${y.screenshot_path}`} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/files/payment-screenshots/${y.screenshot_path}`} alt="Payment screenshot" className="mt-1 max-h-40 rounded border border-line" />
                    </a>
                  )}
                  <p className="text-xs text-ink-muted">{pk(y.created_at)}</p>
                </li>
              ))}
            </ul>
          </Section>
          <Section title={`Interests (${interests.length})`}>
            <ul className="space-y-1 text-sm">
              {interests.map((i) => (
                <li key={i.id}>
                  {i.direction === 'sent' ? '→' : '←'} {i.other} · {i.status}
                  {i.mediation_status ? ` · coordinator: ${i.mediation_status}` : ''} <span className="text-xs text-ink-muted">{pk(i.created_at)}</span>
                </li>
              ))}
            </ul>
          </Section>
          {reports.length > 0 && (
            <Section title={`Reports (${reports.length})`}>
              <ul className="space-y-1 text-sm">
                {reports.map((r) => (
                  <li key={r.id}>
                    <Badge tone={r.status === 'open' ? 'orange' : 'gray'}>{r.status}</Badge> {r.reason} {r.by ? `(by ${r.by})` : ''}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
