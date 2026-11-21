import Link from 'next/link';
import { q, q1 } from '@/lib/db';
import { can, requireAdmin } from '@/lib/admin/auth';
import { Badge, PageHeader } from '@/components/admin/ui';
import { BarList, ColumnChart, StatTile } from '@/components/admin/charts';

export const metadata = { title: 'Dashboard' };

const RANGES = [7, 30, 90] as const;
const PURPOSE: Record<string, string> = { listing: 'New ads', renewal: 'Renewals', featured: 'Featured / Boost', whatsapp_boost: 'WhatsApp Boost', banner: 'Banners', rishta: 'Rishta' };
const METHOD: Record<string, string> = { jazzcash: 'JazzCash', easypaisa: 'Easypaisa', nayapay: 'NayaPay', bank: 'Bank', free: 'Free' };
const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;
const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : now > 0 ? null : 0);

export default async function Dashboard(props: { searchParams: Promise<{ denied?: string; days?: string }> }) {
  const searchParams = await props.searchParams;
  const admin = await requireAdmin();
  const owner = can(admin, []); // money is shown to the Super Admin only
  const days = RANGES.find((r) => String(r) === searchParams.days) ?? 30;
  const P = [days];
  const PK = `(now() at time zone 'Asia/Karachi')::date`;

  const [s, adsDaily, moneyDaily, byCat, byCity, byPurpose, byMethod, topAds, todo, growth] = await Promise.all([
    q1<{
      pending: number; live: number; new_now: number; new_before: number; sold_now: number; money_now: number; money_before: number;
      banners: number; rishta: number; rishta_pending: number; phones: number; views: number; posts: number; free_mode: { enabled?: boolean } | null;
    }>(
      `select
        (select count(*)::int from listings where status = 'pending') as pending,
        (select count(*)::int from listings where status = 'approved' and (expires_at is null or expires_at > now())) as live,
        (select count(*)::int from listings where created_at > now() - make_interval(days => $1::int)) as new_now,
        (select count(*)::int from listings where created_at between now() - make_interval(days => 2 * $1::int) and now() - make_interval(days => $1::int)) as new_before,
        (select count(*)::int from listings where status = 'sold' and sold_at > now() - make_interval(days => $1::int)) as sold_now,
        (select coalesce(sum(amount), 0)::int from payments where status = 'verified' and verified_at > now() - make_interval(days => $1::int)) as money_now,
        (select coalesce(sum(amount), 0)::int from payments where status = 'verified' and verified_at between now() - make_interval(days => 2 * $1::int) and now() - make_interval(days => $1::int)) as money_before,
        (select count(*)::int from banners where status = 'running') as banners,
        (select count(*)::int from rishta_profiles where status = 'approved' and (expires_at is null or expires_at > now())) as rishta,
        (select count(*)::int from rishta_profiles where status = 'pending') as rishta_pending,
        (select count(*)::int from push_devices where is_active) as phones,
        (select coalesce(sum(views), 0)::int from listings where status = 'approved') as views,
        (select count(*)::int from blog_posts where status in ('published', 'scheduled') and published_at <= now()) as posts,
        (select value from site_settings where key = 'public.free_mode') as free_mode`,
      P,
    ),
    q<{ d: Date; n: number }>(
      `select d, (select count(*)::int from listings l where (l.created_at at time zone 'Asia/Karachi')::date = d) as n
         from generate_series(${PK} - ($1::int - 1), ${PK}, interval '1 day') d order by d`,
      P,
    ),
    owner
      ? q<{ d: Date; n: number }>(
          `select d, (select coalesce(sum(amount), 0)::int from payments p where p.status = 'verified' and (p.verified_at at time zone 'Asia/Karachi')::date = d) as n
             from generate_series(${PK} - ($1::int - 1), ${PK}, interval '1 day') d order by d`,
          P,
        )
      : Promise.resolve([]),
    q<{ label: string; value: number; slug: string }>(
      `select c.name_en as label, c.slug, count(l.id)::int as value from categories c
         join listings l on l.category_id = c.id and l.status = 'approved' and (l.expires_at is null or l.expires_at > now())
        group by c.id order by value desc limit 8`,
    ),
    q<{ label: string; value: number }>(
      `select ci.name_en as label, count(l.id)::int as value from cities ci
         join listings l on l.city_id = ci.id and l.status = 'approved' and (l.expires_at is null or l.expires_at > now())
        group by ci.id order by value desc limit 8`,
    ),
    owner
      ? q<{ purpose: string; value: number }>(
          `select purpose::text, coalesce(sum(amount), 0)::int as value from payments
            where status = 'verified' and verified_at > now() - make_interval(days => $1::int) group by 1 order by value desc`,
          P,
        )
      : Promise.resolve([]),
    owner
      ? q<{ method: string; value: number }>(
          `select method::text, count(*)::int as value from payments
            where status in ('verified', 'free') and created_at > now() - make_interval(days => $1::int) group by 1 order by value desc`,
          P,
        )
      : Promise.resolve([]),
    q<{ id: string; reference: string; title: string; views: number }>(
      `select id, reference, title, views from listings where status = 'approved' and (expires_at is null or expires_at > now()) order by views desc limit 6`,
    ),
    q1<{ payments: number; banners: number; reports: number; boost: number; messages: number; reminders: number; reviews: number }>(
      `select
         (select count(*)::int from payments where status = 'pending' and purpose not in ('listing', 'renewal')) as payments,
         (select count(*)::int from banners where status = 'pending' and owner_type = 'brand') as banners,
         (select count(*)::int from reports where status = 'open') as reports,
         (select count(*)::int from listings l where l.boost_requested and l.boost_done_at is null and l.status = 'approved') as boost,
         (select count(*)::int from contact_messages where status = 'new') as messages,
         (select count(*)::int from listings l where l.status = 'approved' and l.expires_at between now() and now() + interval '3 days'
             and not exists (select 1 from listing_reminders r where r.listing_id = l.id and r.channel = 'whatsapp')) as reminders,
         (select count(*)::int from reviews where created_at > now() - interval '2 days') as reviews`,
    ),
    q1<{ referrals: number; rewards: number; followers: number; pushes: number }>(
      `select (select count(*)::int from referrals where status = 'qualified' and qualified_at > now() - make_interval(days => $1::int)) as referrals,
              (select count(*)::int from referral_rewards where created_at > now() - make_interval(days => $1::int)) as rewards,
              (select count(*)::int from push_follows) as followers,
              (select count(*)::int from push_messages where status in ('sent', 'dry_run') and created_at > now() - make_interval(days => $1::int)) as pushes`,
      P,
    ),
  ]);
  const st = s!;
  const day = (d: Date) => ({
    label: d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    short: d.toLocaleDateString('en-PK', { day: 'numeric', timeZone: 'UTC' }),
  });

  const todoItems: [string, string, number][] = [
    ['/admin/listings', 'pending ads', st.pending],
    ['/admin/payments', 'upgrade payments', todo?.payments ?? 0],
    ['/admin/banners', 'banner bookings', todo?.banners ?? 0],
    ['/admin/boost', 'WhatsApp Boosts to post', todo?.boost ?? 0],
    ['/admin/reports', 'open reports', todo?.reports ?? 0],
    ['/admin/messages', 'new messages', todo?.messages ?? 0],
    ['/admin/reminders', 'ads ending in 3 days (not reminded)', todo?.reminders ?? 0],
    ['/admin/rishta', 'Rishta profiles to verify', st.rishta_pending],
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${admin.fullName}`}
        description="Everything at a glance. Numbers update live."
        actions={
          <nav aria-label="Period" className="flex gap-1">
            {RANGES.map((r) => (
              <Link key={r} href={`/admin?days=${r}`} aria-current={r === days ? 'true' : undefined} className={`rounded-full border px-3 py-1 text-sm ${r === days ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>
                {r} days
              </Link>
            ))}
          </nav>
        }
      />
      {searchParams.denied && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">Your role does not have access to that page.</p>
      )}

      <section className="card mb-6 p-4" aria-labelledby="todo">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="todo" className="font-bold">To do</h2>
          <p className="flex items-center gap-2 text-sm">
            Free listings: {st.free_mode?.enabled ? <Badge tone="green">ON</Badge> : <Badge>OFF</Badge>}
            <Link href="/admin/free-listings" className="font-semibold text-brand hover:underline">Change</Link>
          </p>
        </div>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {todoItems.map(([href, label, n]) => (
            <li key={href}>
              <Link href={href} className={`btn-sm border ${n > 0 ? 'border-accent bg-accent-light text-orange-900' : 'border-line bg-white text-ink-muted'}`}>
                <span className="font-bold tabular-nums">{n}</span> {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Live ads" value={st.live.toLocaleString('en-PK')} hint={`${st.pending} waiting`} />
        <StatTile label={`New ads (${days} days)`} value={st.new_now.toLocaleString('en-PK')} delta={{ pct: pct(st.new_now, st.new_before) }} hint={`vs previous ${days} days`} />
        {owner ? (
          <StatTile label={`Money (${days} days)`} value={rs(st.money_now)} delta={{ pct: pct(st.money_now, st.money_before) }} hint="verified payments" />
        ) : (
          <StatTile label={`Sold (${days} days)`} value={st.sold_now} hint="marked sold by sellers" />
        )}
        <StatTile label="Ad views" value={st.views.toLocaleString('en-PK')} hint="all live ads" />
        <StatTile label="Banners running" value={st.banners} />
        <StatTile label="Rishta profiles" value={st.rishta} hint={`${st.rishta_pending} to verify`} />
        <StatTile label="App phones" value={st.phones} hint={`${growth?.followers ?? 0} followed searches`} />
        <StatTile label="Referrals joined" value={growth?.referrals ?? 0} hint={`${growth?.rewards ?? 0} free ads earned · ${days} days`} />
      </ul>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <ColumnChart title={`New ads per day (${days} days)`} data={adsDaily.map((r) => ({ ...day(r.d), value: r.n }))} unit="ads" />
        {owner && <ColumnChart title={`Money received per day (${days} days)`} data={moneyDaily.map((r) => ({ ...day(r.d), value: r.n }))} format={rs} />}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BarList title="Live ads by category" rows={byCat.map((c) => ({ label: c.label, value: c.value, href: `/en/${c.slug}` }))} />
        <BarList title="Live ads by city" rows={byCity} />
        <BarList title="Most viewed live ads" rows={topAds.map((a) => ({ label: `${a.reference} · ${a.title}`, value: a.views, href: `/admin/listings/${a.id}` }))} />
        {owner && <BarList title={`Money by type (${days} days)`} rows={byPurpose.map((p) => ({ label: PURPOSE[p.purpose] ?? p.purpose, value: p.value }))} format={rs} />}
        {owner && <BarList title={`Payments by method (${days} days)`} rows={byMethod.map((m) => ({ label: METHOD[m.method] ?? m.method, value: m.value }))} note="number of payments" />}
        <BarList
          title="Growth tools"
          rows={[
            { label: 'Blog articles live', value: st.posts, href: '/admin/blog' },
            { label: `App notifications (${days} days)`, value: growth?.pushes ?? 0, href: '/admin/push' },
            { label: 'Followed searches in the app', value: growth?.followers ?? 0, href: '/admin/push' },
          ]}
        />
      </div>

      <p className="mt-6 text-xs text-ink-muted">
        Quick links: <Link href="/admin/daily-post" className="text-brand hover:underline">Daily WhatsApp post</Link> ·{' '}
        <Link href="/admin/qr" className="text-brand hover:underline">QR posters</Link> ·{' '}
        <Link href="/admin/reminders" className="text-brand hover:underline">Expiry reminders</Link>
        {owner && <> · <Link href="/admin/backups" className="text-brand hover:underline">Backups</Link></>}
      </p>
    </>
  );
}
