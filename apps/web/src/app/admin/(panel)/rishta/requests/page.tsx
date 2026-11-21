import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { Badge, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { handleMediation, handleRishtaReport } from '../actions';

export const metadata = { title: 'Rishta requests' };

export default async function RishtaRequests(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['rishta_coordinator']);
  const [mediation, reports] = await Promise.all([
    q<{
      id: number; mediation_status: string; mediation_note: string | null; status: string; created_at: string;
      a_id: string; a_ref: string; a_guard: string; a_phone: string; b_id: string; b_ref: string; b_guard: string; b_phone: string;
    }>(
      `select i.id, i.mediation_status, i.mediation_note, i.status::text, i.created_at,
              a.id as a_id, a.reference as a_ref, a.guardian_name as a_guard, a.guardian_phone as a_phone,
              b.id as b_id, b.reference as b_ref, b.guardian_name as b_guard, b.guardian_phone as b_phone
         from rishta_interests i join rishta_profiles a on a.id = i.from_profile_id join rishta_profiles b on b.id = i.to_profile_id
        where i.mediation_requested and i.mediation_status <> 'done' order by i.created_at`,
    ),
    q<{ id: number; reason: string; created_at: string; profile_id: string; ref: string; by: string | null; n: number }>(
      `select r.id, r.reason, r.created_at, p.id as profile_id, p.reference as ref, b.reference as by,
              (select count(*)::int from rishta_reports x where x.profile_id = r.profile_id) as n
         from rishta_reports r join rishta_profiles p on p.id = r.profile_id left join rishta_profiles b on b.id = r.reported_by
        where r.status = 'open' order by r.created_at`,
    ),
  ]);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/rishta" className="text-brand hover:underline">← Rishta</Link></p>
      <PageHeader title="Coordinator requests and reports" description="Families who asked the coordinator to help, and profiles reported by members." />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      <Section title={`Coordinator requests (${mediation.length})`}>
        <ul className="space-y-3 text-sm">
          {mediation.map((m) => (
            <li key={m.id} className="rounded-lg border border-line p-3">
              <p className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/rishta/${m.a_id}`} className="font-semibold text-brand">{m.a_ref}</Link> → <Link href={`/admin/rishta/${m.b_id}`} className="font-semibold text-brand">{m.b_ref}</Link>
                <Badge>{m.status}</Badge> <Badge tone="orange">{m.mediation_status}</Badge>
              </p>
              <p className="mt-1">{m.a_ref}: {m.a_guard} · <a href={`tel:${m.a_phone}`} className="text-brand">{m.a_phone}</a></p>
              <p>{m.b_ref}: {m.b_guard} · <a href={`tel:${m.b_phone}`} className="text-brand">{m.b_phone}</a></p>
              {m.mediation_note && <p className="mt-1 rounded bg-page p-2">“{m.mediation_note}”</p>}
              <div className="mt-2 flex gap-2">
                {(['in_progress', 'done'] as const).map((st) => (
                  <form key={st} action={handleMediation}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="status" value={st} />
                    <SubmitButton className="btn-sm border border-line bg-white">{st === 'in_progress' ? 'Working on it' : 'Done'}</SubmitButton>
                  </form>
                ))}
              </div>
            </li>
          ))}
          {!mediation.length && <li className="text-ink-muted">No open requests.</li>}
        </ul>
      </Section>
      <Section title={`Open reports (${reports.length})`}>
        <ul className="space-y-2 text-sm">
          {reports.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2">
              <Link href={`/admin/rishta/${r.profile_id}`} className="font-semibold text-brand">{r.ref}</Link>
              <span>“{r.reason}”</span>
              {r.by && <span className="text-ink-muted">by {r.by}</span>}
              {r.n > 1 && <Badge tone="red">{r.n} reports</Badge>}
              <span className="ms-auto flex gap-1">
                {(['actioned', 'dismissed'] as const).map((st) => (
                  <form key={st} action={handleRishtaReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value={st} />
                    <SubmitButton className="btn-sm border border-line bg-white">{st === 'actioned' ? 'Handled' : 'Dismiss'}</SubmitButton>
                  </form>
                ))}
              </span>
            </li>
          ))}
          {!reports.length && <li className="text-ink-muted">No open reports.</li>}
        </ul>
      </Section>
    </>
  );
}
