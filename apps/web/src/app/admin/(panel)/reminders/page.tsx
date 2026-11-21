import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { Badge, Notice, PageHeader } from '@/components/admin/ui';
import { whatsappReminder } from './actions';

export const metadata = { title: 'Expiry reminders' };

type Row = {
  id: string; reference: string; title: string; seller_name: string; expires_at: Date; status: string; free: boolean;
  wa_sent: Date | null; push_sent: Date | null; has_app: boolean; renewed: boolean;
};

const TABS = [
  ['soon', 'Ending in 3 days'],
  ['expired', 'Ended in last 7 days'],
] as const;

export default async function RemindersPage(props: { searchParams: Promise<{ tab?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  const tab = searchParams.tab === 'expired' ? 'expired' : 'soon';
  const where =
    tab === 'soon'
      ? `l.status = 'approved' and l.expires_at between now() and now() + interval '3 days'`
      : `(l.status = 'expired' or (l.status = 'approved' and l.expires_at <= now())) and l.expires_at > now() - interval '7 days'`;
  const rows = await q<Row>(
    `select l.id, l.reference, l.title, l.seller_name, l.expires_at, l.status, l.is_free as free,
            (select max(created_at) from listing_reminders r where r.listing_id = l.id and r.channel = 'whatsapp') as wa_sent,
            (select max(created_at) from listing_reminders r where r.listing_id = l.id and r.channel = 'push') as push_sent,
            exists (select 1 from push_device_listings x join push_devices d on d.id = x.device_id where x.listing_id = l.id and d.is_active) as has_app,
            exists (select 1 from payments p where p.listing_id = l.id and p.purpose = 'renewal' and p.created_at > l.expires_at - interval '7 days') as renewed
       from listings l where ${where} order by l.expires_at ${tab === 'soon' ? 'asc' : 'desc'} limit 300`,
  ).catch(() => [] as Row[]);
  const fmt = (d: Date) => d.toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' });

  return (
    <>
      <PageHeader
        title="Expiry reminders"
        description="Remind sellers to renew. App users get a push automatically 2 days before the end. For everyone else, click WhatsApp: a ready message with their renew link opens."
      />
      <Notice error={searchParams.error} />
      <div className="mb-4 flex gap-2">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/reminders?tab=${k}`} className={`rounded-full border px-3 py-1 text-sm ${tab === k ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>
            {label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="card p-6 text-ink-muted">Nothing here right now.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Seller</th>
                <th>{tab === 'soon' ? 'Ends' : 'Ended'}</th>
                <th>Reminded</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/listings/${r.id}`} className="font-semibold text-brand hover:underline">{r.reference}</Link>
                    <span className="block max-w-xs truncate text-xs text-ink-muted" dir="auto">{r.title}</span>
                  </td>
                  <td>{r.seller_name} {r.free && <Badge>free ad</Badge>}</td>
                  <td className="whitespace-nowrap text-ink-muted">{fmt(r.expires_at)}</td>
                  <td className="text-xs">
                    {r.has_app && <span className="block">App: {r.push_sent ? `push sent ${fmt(r.push_sent)}` : 'push will be sent'}</span>}
                    {r.wa_sent && <span className="block">WhatsApp: {fmt(r.wa_sent)}</span>}
                    {r.renewed && <Badge tone="green">renew requested</Badge>}
                    {!r.has_app && !r.wa_sent && !r.renewed && <span className="text-ink-muted">—</span>}
                  </td>
                  <td>
                    <form action={whatsappReminder} target="_blank">
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="btn-sm bg-[#1FAF5A] text-white hover:bg-[#178A47]">
                        {r.wa_sent ? 'WhatsApp again' : 'WhatsApp reminder'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
