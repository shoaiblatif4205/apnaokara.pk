import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { Badge, Notice, PageHeader } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { setMessageStatus } from './actions';

export const metadata = { title: 'Messages' };

type Msg = {
  id: number; name: string; phone: string | null; email: string | null; subject: string | null; message: string;
  locale: string; status: string; created_at: Date; handled_by_name: string | null;
};

const SUBJECTS: Record<string, string> = { general: 'General', ad: 'About an ad', payment: 'Payment', advertise: 'Advertising', rishta: 'Rishta', report: 'Problem' };
const TABS = [['new', 'New'], ['replied', 'Replied'], ['closed', 'Closed']] as const;

export default async function MessagesPage(props: { searchParams: Promise<{ status?: string; saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  const status = TABS.some(([k]) => k === searchParams.status) ? searchParams.status! : 'new';
  const [rows, counts] = await Promise.all([
    q<Msg>(
      `select m.*, a.full_name as handled_by_name from contact_messages m left join admin_users a on a.id = m.handled_by
        where m.status = $1 order by m.created_at desc limit 200`,
      [status],
    ),
    q<{ status: string; n: number }>('select status, count(*)::int as n from contact_messages group by status'),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const wa = (p: string) => `https://wa.me/${p.replace(/\D/g, '').replace(/^0/, '92')}`;

  return (
    <>
      <PageHeader title="Messages" description="Messages from the Contact Us page (website and app). Reply by WhatsApp, phone or email, then mark as replied." />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      <div className="mb-4 flex gap-2">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/messages?status=${k}`} className={`rounded-full border px-3 py-1 text-sm ${status === k ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>
            {label} ({count(k)})
          </Link>
        ))}
      </div>
      {rows.length === 0 && <p className="card p-6 text-ink-muted">No messages here.</p>}
      <ul className="space-y-3">
        {rows.map((m) => (
          <li key={m.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {m.name} <Badge>{SUBJECTS[m.subject ?? 'general'] ?? m.subject}</Badge> {m.locale === 'ur' && <Badge>Urdu</Badge>}
                </p>
                <p className="mt-1 flex flex-wrap gap-3 text-sm">
                  {m.phone && (
                    <>
                      <a href={wa(m.phone)} target="_blank" rel="noreferrer" className="text-brand hover:underline">WhatsApp {m.phone}</a>
                      <a href={`tel:${m.phone}`} className="text-brand hover:underline">Call</a>
                    </>
                  )}
                  {m.email && <a href={`mailto:${m.email}`} className="text-brand hover:underline">{m.email}</a>}
                </p>
              </div>
              <p className="text-xs text-ink-muted">
                {m.created_at.toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}
                {m.handled_by_name && <> · by {m.handled_by_name}</>}
              </p>
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-page p-3 text-sm" dir="auto">{m.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TABS.filter(([k]) => k !== m.status).map(([k, label]) => (
                <form key={k} action={setMessageStatus}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="status" value={k} />
                  <input type="hidden" name="back" value={status} />
                  <SubmitButton className="btn-sm border border-line bg-white">Mark {label.toLowerCase()}</SubmitButton>
                </form>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
