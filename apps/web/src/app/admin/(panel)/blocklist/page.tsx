import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { str } from '@/lib/admin/form';
import { normalizePhone } from '@/lib/phone';
import { Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';

export const metadata = { title: 'Blocked numbers' };

async function addBlock(fd: FormData) {
  'use server';
  const admin = await requireAdmin(['moderator']);
  const phone = normalizePhone(str(fd, 'phone'));
  if (!phone) redirect('/admin/blocklist?error=Enter%20a%20valid%20Pakistani%20mobile%20number');
  await q('insert into blocked_phones (phone, reason, blocked_by) values ($1, $2, $3) on conflict (phone) do update set reason = excluded.reason', [
    phone, str(fd, 'reason') || null, admin.id,
  ]);
  await logActivity(admin.id, 'phone.block', 'blocked_phones', phone, { reason: str(fd, 'reason') });
  revalidatePath('/admin/blocklist');
  redirect('/admin/blocklist?saved=1');
}

async function removeBlock(fd: FormData) {
  'use server';
  const admin = await requireAdmin(['moderator']);
  const phone = str(fd, 'phone');
  await q('delete from blocked_phones where phone = $1', [phone]);
  await logActivity(admin.id, 'phone.unblock', 'blocked_phones', phone);
  revalidatePath('/admin/blocklist');
  redirect('/admin/blocklist?saved=1');
}

export default async function BlocklistPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  const rows = await q<{ phone: string; reason: string | null; created_at: string; by: string | null; ads: number }>(
    `select b.phone, b.reason, b.created_at, a.full_name as by,
            (select count(*)::int from listings l where l.seller_phone = b.phone) as ads
       from blocked_phones b left join admin_users a on a.id = b.blocked_by order by b.created_at desc`,
  );
  return (
    <>
      <PageHeader title="Blocked numbers" description="These numbers cannot post ads, reviews or upgrades. Their old ads stay in records." />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      <Section title="Block a number">
        <form action={addBlock} className="grid items-end gap-3 md:grid-cols-[200px_1fr_auto]">
          <Field label="Phone" htmlFor="bphone">
            <input id="bphone" name="phone" type="tel" placeholder="03001234567" className="admin-input" required />
          </Field>
          <Field label="Reason" htmlFor="breason">
            <input id="breason" name="reason" className="admin-input" placeholder="Fraud, fake ads…" />
          </Field>
          <SubmitButton className="btn-danger">Block</SubmitButton>
        </form>
      </Section>
      <Section title={`${rows.length} blocked`}>
        <ul className="space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.phone} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2">
              <span>
                <span className="font-semibold">{r.phone}</span> · {r.reason ?? 'No reason'} · {r.ads} ad(s) ·{' '}
                <span className="text-ink-muted">
                  {new Date(r.created_at).toLocaleDateString('en-PK')} {r.by ? `by ${r.by}` : ''}
                </span>
              </span>
              <form action={removeBlock}>
                <input type="hidden" name="phone" value={r.phone} />
                <SubmitButton className="btn-sm border border-line bg-white" confirm={`Unblock ${r.phone}?`}>
                  Unblock
                </SubmitButton>
              </form>
            </li>
          ))}
          {!rows.length && <li className="text-ink-muted">No blocked numbers.</li>}
        </ul>
      </Section>
    </>
  );
}
