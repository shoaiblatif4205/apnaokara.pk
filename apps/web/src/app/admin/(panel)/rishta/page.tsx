import Link from 'next/link';
import { optionLabel, RISHTA_OPTIONS } from '@apna-okara/shared';
import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { Badge, PageHeader, Section } from '@/components/admin/ui';

export const metadata = { title: 'Rishta' };

const TABS = ['pending', 'approved', 'expired', 'rejected', 'hidden', 'removed', 'all'] as const;

type Row = {
  id: string; reference: string; full_name: string | null; gender: string; age: number; status: string; created_at: string; expires_at: string | null;
  phone: string; city: string | null; current_country: string; created_by: string; photos_pending: number; pay_status: string | null; pay_amount: number | null;
  is_premium: boolean;
};

export default async function RishtaAdmin(props: { searchParams: Promise<{ tab?: string; gender?: string; q?: string }> }) {
  const searchParams = await props.searchParams;
  const admin = await requireAdmin(['rishta_coordinator']);
  const tab = (TABS as readonly string[]).includes(searchParams.tab ?? '') ? searchParams.tab! : 'pending';
  // The female coordinator sees girls' profiles first
  const gender = ['male', 'female', 'all'].includes(searchParams.gender ?? '') ? searchParams.gender! : admin.role === 'rishta_coordinator' ? 'female' : 'all';
  const search = (searchParams.q ?? '').trim();
  const params: unknown[] = [];
  const w: string[] = [];
  if (tab === 'expired') w.push(`(p.status = 'expired' or (p.status = 'approved' and p.expires_at <= now()))`);
  else if (tab === 'approved') w.push(`p.status = 'approved' and (p.expires_at is null or p.expires_at > now())`);
  else if (tab !== 'all') {
    params.push(tab);
    w.push(`p.status = $${params.length}::rishta_status`);
  }
  if (gender !== 'all') {
    params.push(gender);
    w.push(`p.gender = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    w.push(`(p.reference ilike $${params.length} or p.full_name ilike $${params.length} or a.phone ilike $${params.length} or p.guardian_phone ilike $${params.length})`);
  }
  const rows = await q<Row>(
    `select p.id, p.reference, p.full_name, p.gender, date_part('year', age(p.date_of_birth))::int as age, p.status::text, p.created_at, p.expires_at,
            a.phone, c.name_en as city, p.current_country, p.created_by,
            p.is_premium and (p.premium_until is null or p.premium_until > now()) as is_premium,
            (select count(*)::int from rishta_photos f where f.profile_id = p.id and not f.is_approved and not f.is_rejected) as photos_pending,
            y.status::text as pay_status, y.amount as pay_amount
       from rishta_profiles p join rishta_accounts a on a.id = p.account_id left join cities c on c.id = p.native_city_id
       left join lateral (select status, amount from payments where rishta_profile_id = p.id order by created_at desc limit 1) y on true
      ${w.length ? `where ${w.join(' and ')}` : ''}
      order by p.created_at ${tab === 'pending' ? 'asc' : 'desc'} limit 200`,
    params,
  );
  const todo = await q1<{ photos: number; mediation: number; reports: number; pending: number }>(
    `select (select count(*)::int from rishta_photos f join rishta_profiles p on p.id = f.profile_id where not f.is_approved and not f.is_rejected) as photos,
            (select count(*)::int from rishta_interests where mediation_status = 'open') as mediation,
            (select count(*)::int from rishta_reports where status = 'open') as reports,
            (select count(*)::int from rishta_profiles where status = 'pending') as pending`,
  );
  const qs = (extra: Record<string, string>) => new URLSearchParams({ tab, gender, q: search, ...extra }).toString();

  return (
    <>
      <PageHeader
        title="Rishta"
        description="Call the family on the guardian number before approving. Girls' profiles are checked by the female coordinator. Everything is kept in records."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/rishta/requests" className="btn-sm border border-line bg-white">
              Requests and reports ({(todo?.mediation ?? 0) + (todo?.reports ?? 0)})
            </Link>
            <Link href="/admin/rishta/stories" className="btn-sm border border-line bg-white">
              Success stories
            </Link>
          </div>
        }
      />
      <p className="mb-4 text-sm text-ink-muted">
        To do: {todo?.pending ?? 0} profiles waiting · {todo?.photos ?? 0} photos to check · {todo?.mediation ?? 0} coordinator requests · {todo?.reports ?? 0} reports
      </p>
      <nav className="mb-3 flex flex-wrap gap-1">
        {TABS.map((k) => (
          <Link key={k} href={`/admin/rishta?${qs({ tab: k })}`} className={`btn-sm border capitalize ${tab === k ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>
            {k}
          </Link>
        ))}
      </nav>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input type="hidden" name="tab" value={tab} />
        <label htmlFor="rq" className="sr-only">Search</label>
        <input id="rq" name="q" defaultValue={search} placeholder="R-…, name or phone" className="admin-input max-w-xs" />
        <label htmlFor="rg" className="sr-only">Gender</label>
        <select id="rg" name="gender" defaultValue={gender} className="admin-input max-w-[160px]">
          <option value="all">Boys and girls</option>
          <option value="female">Girls</option>
          <option value="male">Boys</option>
        </select>
        <button type="submit" className="btn-sm border border-line bg-white">Search</button>
      </form>
      <Section title={`${rows.length} profile(s)`}>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/rishta/${r.id}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3 text-sm hover:border-brand">
                <span className="font-bold">{r.reference}</span>
                <span>
                  {r.full_name} · {r.gender === 'female' ? 'Girl' : 'Boy'}, {r.age} · {r.city ?? '-'}
                  {r.current_country !== 'Pakistan' ? ` · ${r.current_country}` : ''}
                </span>
                <span className="text-ink-muted">
                  {optionLabel(RISHTA_OPTIONS.createdBy, r.created_by, 'en')} · {r.phone}
                </span>
                <span className="ms-auto flex flex-wrap gap-1">
                  <Badge tone={r.status === 'approved' ? 'green' : r.status === 'pending' ? 'orange' : r.status === 'rejected' || r.status === 'removed' ? 'red' : 'gray'}>{r.status}</Badge>
                  {r.is_premium && <Badge tone="orange">Premium</Badge>}
                  {r.photos_pending > 0 && <Badge tone="orange">{r.photos_pending} photo(s) to check</Badge>}
                  {r.pay_status && <Badge>{r.pay_status === 'free' ? 'Free' : `Rs ${r.pay_amount} ${r.pay_status}`}</Badge>}
                </span>
              </Link>
            </li>
          ))}
          {!rows.length && <li className="text-ink-muted">Nothing here.</li>}
        </ul>
      </Section>
    </>
  );
}
