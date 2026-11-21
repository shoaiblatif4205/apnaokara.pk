import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { Badge, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { handleReport } from './actions';

export const metadata = { title: 'Reports' };

const REASON: Record<string, string> = {
  fraud: 'Fraud or scam',
  wrong_category: 'Wrong category',
  sold: 'Already sold',
  offensive: 'Offensive',
  duplicate: 'Duplicate ad',
  other: 'Other',
};

type Row = {
  id: number; reason: string; details: string | null; reporter_phone: string | null; status: string; created_at: string;
  listing_id: string; reference: string; title: string; listing_status: string; handler: string | null; same_ad: number;
};

export default async function ReportsPage(props: { searchParams: Promise<{ tab?: string; saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  const tab = searchParams.tab === 'closed' ? 'closed' : 'open';
  const rows = await q<Row>(
    `select r.id, r.reason, r.details, r.reporter_phone, r.status, r.created_at, l.id as listing_id, l.reference, l.title,
            l.status as listing_status, a.full_name as handler,
            (select count(*)::int from reports x where x.listing_id = r.listing_id) as same_ad
       from reports r join listings l on l.id = r.listing_id left join admin_users a on a.id = r.handled_by
      where ${tab === 'open' ? `r.status = 'open'` : `r.status <> 'open'`}
      order by r.created_at desc limit 200`,
  );

  return (
    <>
      <PageHeader title="Reports" description="Ads reported by visitors. Open the ad to remove it or block the number, then mark the report as handled." />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      <nav className="mb-4 flex gap-1">
        {(['open', 'closed'] as const).map((k) => (
          <Link key={k} href={`/admin/reports?tab=${k}`} className={`btn-sm border ${tab === k ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>
            {k === 'open' ? 'Open' : 'Handled'}
          </Link>
        ))}
      </nav>
      <Section title={`${rows.length} report(s)`}>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-line p-3 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <Badge tone={r.reason === 'fraud' ? 'red' : 'orange'}>{REASON[r.reason] ?? r.reason}</Badge>
                <Link href={`/admin/listings/${r.listing_id}`} className="font-semibold text-brand hover:underline">
                  {r.reference} · {r.title}
                </Link>
                <Badge>{r.listing_status}</Badge>
                {r.same_ad > 1 && <Badge tone="red">{r.same_ad} reports on this ad</Badge>}
              </p>
              {r.details && <p className="mt-1">“{r.details}”</p>}
              <p className="mt-1 text-xs text-ink-muted">
                {new Date(r.created_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}
                {r.reporter_phone ? ` · ${r.reporter_phone}` : ''}
                {r.handler ? ` · ${r.status} by ${r.handler}` : ''}
              </p>
              {r.status === 'open' && (
                <div className="mt-2 flex gap-2">
                  {(['actioned', 'dismissed'] as const).map((s) => (
                    <form key={s} action={handleReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value={s} />
                      <input type="hidden" name="tab" value={tab} />
                      <SubmitButton className="btn-sm border border-line bg-white hover:border-brand">
                        {s === 'actioned' ? 'Handled (action taken)' : 'Dismiss'}
                      </SubmitButton>
                    </form>
                  ))}
                </div>
              )}
            </li>
          ))}
          {!rows.length && <li className="text-ink-muted">Nothing here.</li>}
        </ul>
      </Section>
    </>
  );
}
