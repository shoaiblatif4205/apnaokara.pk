import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { referralSettings } from '@/lib/referrals';
import { Badge, Checkbox, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { saveReferralSettings, setReferralStatus } from './actions';

export const metadata = { title: 'Referrals' };

export default async function ReferralsPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  const [s, top, recent, rewards] = await Promise.all([
    referralSettings(),
    q<{ phone: string; code: string; qualified: number; pending: number; rewards: number }>(
      `select c.phone, c.code,
              count(r.*) filter (where r.status = 'qualified')::int as qualified,
              count(r.*) filter (where r.status = 'pending')::int as pending,
              (select count(*)::int from referral_rewards w where w.phone = c.phone) as rewards
         from referral_codes c join referrals r on r.referrer_phone = c.phone
        group by c.phone, c.code order by qualified desc, pending desc limit 20`,
    ),
    q<{ id: number; referrer_phone: string; referred_phone: string; status: string; created_at: Date; reference: string | null; listing_id: string | null; reject_reason: string | null }>(
      `select r.id, r.referrer_phone, r.referred_phone, r.status, r.created_at, l.reference, r.listing_id, r.reject_reason
         from referrals r left join listings l on l.id = r.listing_id order by r.created_at desc limit 100`,
    ),
    q<{ phone: string; code: string; used_count: number; created_at: Date }>(
      `select w.phone, p.code, p.used_count, w.created_at from referral_rewards w join promo_codes p on p.id = w.promo_code_id order by w.created_at desc limit 50`,
    ),
  ]);
  const mask = (p: string) => `${p.slice(0, 4)}•••${p.slice(-3)}`;

  return (
    <>
      <PageHeader
        title="Referrals"
        description={`Sellers share their code (shown in My Ad). When ${s.needed} brand-new members post with it and their first ad is approved, the seller gets a one-time promo code for a free ${s.reward_days}-day ad, locked to their phone.`}
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      <Section title="Settings">
        <form action={saveReferralSettings} className="grid items-end gap-3 md:grid-cols-4">
          <Checkbox name="enabled" label="Referrals on" defaultChecked={s.enabled} />
          <Field label="Friends needed" htmlFor="needed"><input id="needed" name="needed" type="number" min={1} max={50} defaultValue={s.needed} className="admin-input" /></Field>
          <Field label="Free ad length (days)" htmlFor="rd">
            <select id="rd" name="reward_days" defaultValue={s.reward_days} className="admin-input">
              {[7, 10, 15, 20, 25, 30].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <SubmitButton>Save</SubmitButton>
        </form>
      </Section>

      <Section title="Top inviters">
        {top.length === 0 ? <p className="text-sm text-ink-muted">No referrals yet.</p> : (
          <table className="admin-table">
            <thead><tr><th>Phone</th><th>Code</th><th>Joined</th><th>Waiting</th><th>Free ads earned</th></tr></thead>
            <tbody>
              {top.map((t) => (
                <tr key={t.phone}><td dir="ltr">{mask(t.phone)}</td><td className="font-mono">{t.code}</td><td>{t.qualified}</td><td>{t.pending}</td><td>{t.rewards}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Recent referrals" description="If a number looks fake (same person with two SIMs, many from one phone), mark it as Not counted.">
        {recent.length === 0 ? <p className="text-sm text-ink-muted">None yet.</p> : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead><tr><th>Date</th><th>Invited by</th><th>New member</th><th>Ad</th><th>Status</th><th /></tr></thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td className="text-ink-muted">{r.created_at.toLocaleDateString('en-PK')}</td>
                    <td dir="ltr">{mask(r.referrer_phone)}</td>
                    <td dir="ltr">{mask(r.referred_phone)}</td>
                    <td>{r.listing_id ? <Link href={`/admin/listings/${r.listing_id}`} className="text-brand hover:underline">{r.reference}</Link> : '—'}</td>
                    <td>
                      <Badge tone={r.status === 'qualified' ? 'green' : r.status === 'rejected' ? 'red' : 'orange'}>{r.status === 'rejected' ? 'not counted' : r.status}</Badge>
                      {r.reject_reason && <span className="block text-xs text-ink-muted">{r.reject_reason}</span>}
                    </td>
                    <td>
                      <form action={setReferralStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value={r.status === 'rejected' ? 'pending' : 'rejected'} />
                        <SubmitButton className={r.status === 'rejected' ? 'btn-sm border border-line bg-white' : 'btn-danger'}>
                          {r.status === 'rejected' ? 'Count again' : 'Not counted'}
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Free ad codes given">
        {rewards.length === 0 ? <p className="text-sm text-ink-muted">None yet.</p> : (
          <ul className="space-y-1 text-sm">
            {rewards.map((w) => (
              <li key={w.code}><span className="font-mono font-semibold">{w.code}</span> · <span dir="ltr">{mask(w.phone)}</span> · {w.created_at.toLocaleDateString('en-PK')} · {w.used_count ? <Badge tone="green">used</Badge> : <Badge>not used yet</Badge>}</li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
