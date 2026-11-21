import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { getSetting } from '@/lib/settings';
import { Badge, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { retryQueue, savePushSettings, sendBroadcast } from './actions';

export const metadata = { title: 'App notifications' };

const KIND: Record<string, string> = {
  ad_approved: 'Ad approved', ad_rejected: 'Ad rejected', ad_expiring: 'Ad ending soon', follow_new: 'New ad (followed)',
  rishta_interest: 'Rishta interest', rishta_accepted: 'Rishta accepted', broadcast: 'Message to all',
};

export default async function PushPage(props: { searchParams: Promise<{ saved?: string; error?: string; sent?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin([]);
  const [devices, byKind, recent, follows, settings] = await Promise.all([
    q1<{ total: number; active: number; ur: number; en: number; android: number; ios: number; week: number }>(
      `select count(*)::int as total, count(*) filter (where is_active)::int as active,
              count(*) filter (where is_active and locale = 'ur')::int as ur, count(*) filter (where is_active and locale = 'en')::int as en,
              count(*) filter (where is_active and platform = 'android')::int as android, count(*) filter (where is_active and platform = 'ios')::int as ios,
              count(*) filter (where last_seen_at > now() - interval '7 days')::int as week
         from push_devices`,
    ),
    q<{ kind: string; sent: number; failed: number; queued: number; dry: number }>(
      `select kind, count(*) filter (where status = 'sent')::int as sent, count(*) filter (where status = 'failed')::int as failed,
              count(*) filter (where status = 'queued')::int as queued, count(*) filter (where status = 'dry_run')::int as dry
         from push_messages where created_at > now() - interval '30 days' group by kind order by kind`,
    ),
    q<{ id: number; kind: string; title: string; body: string; status: string; error: string | null; created_at: Date }>(
      'select id, kind, title, body, status, error, created_at from push_messages order by created_at desc limit 30',
    ),
    q<{ name: string; n: number }>(
      `select c.name_en || coalesce(' · ' || ci.name_en, '') as name, count(*)::int as n
         from push_follows f join categories c on c.id = f.category_id left join cities ci on ci.id = f.city_id
        group by 1 order by n desc limit 10`,
    ),
    getSetting<{ follow_gap_hours?: number; expiring_hours?: number }>('public.push'),
  ]);
  const live = process.env.PUSH_SEND === '1';
  const tone = (s: string) => (s === 'sent' ? 'green' : s === 'failed' ? 'red' : s === 'queued' ? 'orange' : 'gray');

  return (
    <>
      <PageHeader
        title="App notifications"
        description="Push messages to the Apna Okara app: ad approved / rejected, ad ending soon, new ads in followed categories, Rishta interests. The app asks people before turning them on."
      />
      <Notice saved={searchParams.saved && (searchParams.sent ? `Queued for ${searchParams.sent} phone(s).` : '1')} error={searchParams.error} />
      {!live && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Test mode: messages are recorded as “dry run” and not sent. On the live site set <code>PUSH_SEND=1</code> (and the Expo project) to send them to phones.
        </p>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Phones with notifications', devices?.active ?? 0],
          ['Opened the app this week', devices?.week ?? 0],
          ['Urdu / English', `${devices?.ur ?? 0} / ${devices?.en ?? 0}`],
          ['Android / iPhone', `${devices?.android ?? 0} / ${devices?.ios ?? 0}`],
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-4">
            <p className="text-xs font-semibold uppercase text-ink-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <Section title="Send a message to app users" description="Use rarely (offers, important news). Too many messages make people turn notifications off.">
        <form action={sendBroadcast} className="grid gap-3 md:grid-cols-2">
          <Field label="Title" htmlFor="b-title" hint="Up to 60 letters">
            <input id="b-title" name="title" maxLength={60} required className="admin-input" dir="auto" />
          </Field>
          <Field label="Send to" htmlFor="b-locale">
            <select id="b-locale" name="locale" className="admin-input">
              <option value="all">Everyone</option>
              <option value="ur">Urdu app users</option>
              <option value="en">English app users</option>
            </select>
          </Field>
          <Field label="Message" htmlFor="b-body" hint="Up to 180 letters">
            <textarea id="b-body" name="body" maxLength={180} rows={2} required className="admin-input" dir="auto" />
          </Field>
          <Field label="Opens (optional)" htmlFor="b-url" hint="A page of the site, e.g. /mobiles or /post-ad">
            <input id="b-url" name="url" className="admin-input" dir="ltr" placeholder="/post-ad" />
          </Field>
          <div className="md:col-span-2">
            <SubmitButton confirm={`Send this to ${devices?.active ?? 0} phone(s)?`}>Send</SubmitButton>
          </div>
        </form>
      </Section>

      <Section title="Last 30 days">
        {byKind.length === 0 ? (
          <p className="text-sm text-ink-muted">No messages yet.</p>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Type</th><th>Sent</th><th>Failed</th><th>Waiting</th><th>Test (dry run)</th></tr></thead>
            <tbody>
              {byKind.map((k) => (
                <tr key={k.kind}><td>{KIND[k.kind] ?? k.kind}</td><td>{k.sent}</td><td>{k.failed}</td><td>{k.queued}</td><td>{k.dry}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        <form action={retryQueue} className="mt-3"><SubmitButton className="btn-sm border border-line bg-white">Send waiting messages now</SubmitButton></form>
      </Section>

      {follows.length > 0 && (
        <Section title="Most followed" description="What app users want to hear about. Good ideas for banners and blog posts.">
          <ul className="grid gap-1 text-sm md:grid-cols-2">
            {follows.map((f) => <li key={f.name}>{f.name} · <span className="font-semibold">{f.n}</span></li>)}
          </ul>
        </Section>
      )}

      <Section title="Recent messages">
        <ul className="space-y-2 text-sm">
          {recent.map((m) => (
            <li key={m.id} className="rounded-lg border border-line p-2">
              <Badge tone={tone(m.status)}>{m.status}</Badge> <span className="font-semibold">{KIND[m.kind] ?? m.kind}</span> · <span dir="auto">{m.title}</span>
              <span className="block text-ink-muted" dir="auto">{m.body}</span>
              <span className="text-xs text-ink-muted">{m.created_at.toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}{m.error ? ` · ${m.error}` : ''}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Settings">
        <form action={savePushSettings} className="grid items-end gap-3 md:grid-cols-3">
          <Field label="Followed category: at most one message every (hours)" htmlFor="gap">
            <input id="gap" name="follow_gap_hours" type="number" min={1} max={48} defaultValue={settings?.follow_gap_hours ?? 6} className="admin-input" />
          </Field>
          <Field label="“Ad ending soon” this many hours before" htmlFor="exp">
            <input id="exp" name="expiring_hours" type="number" min={6} max={168} defaultValue={settings?.expiring_hours ?? 48} className="admin-input" />
          </Field>
          <SubmitButton>Save</SubmitButton>
        </form>
      </Section>
    </>
  );
}
