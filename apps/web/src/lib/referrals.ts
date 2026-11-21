import { randomInt } from 'node:crypto';
import type { PoolClient } from 'pg';
import { q, q1, tx } from '@/lib/db';
import { getSetting } from '@/lib/settings';

// "Bring 5 new members, get a free 7-day ad."
// - Every phone that posts gets a referral code (shown in My Ad).
// - A new member types the code (or opens /post-ad?ref=CODE) when posting.
// - It counts once that member's first ad is approved, and only for phone
//   numbers that never posted before (no self-referral).
// - When the needed number is reached, a one-time promo code locked to the
//   referrer's phone is created (worth one 7-day ad).

export type ReferralSettings = { enabled: boolean; needed: number; reward_days: number };
const DEFAULTS: ReferralSettings = { enabled: true, needed: 5, reward_days: 7 };
export async function referralSettings(): Promise<ReferralSettings> {
  return { ...DEFAULTS, ...((await getSetting<Partial<ReferralSettings>>('public.referral')) ?? {}) };
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const makeCode = (len: number) => Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

export async function referralCode(phone: string): Promise<string> {
  const have = await q1<{ code: string }>('select code from referral_codes where phone = $1', [phone]);
  if (have) return have.code;
  for (let i = 0; i < 5; i++) {
    const r = await q1<{ code: string }>(
      `insert into referral_codes (phone, code) values ($1, $2) on conflict do nothing returning code`,
      [phone, `AO${makeCode(5)}`],
    );
    if (r) return r.code;
    const again = await q1<{ code: string }>('select code from referral_codes where phone = $1', [phone]);
    if (again) return again.code;
  }
  throw new Error('Could not make a referral code');
}

/** Called inside createListing's transaction. Invalid codes are ignored (the ad still posts). */
export async function recordReferral(c: PoolClient, codeInput: string, referredPhone: string, listingId: string): Promise<boolean> {
  const code = codeInput.trim().toUpperCase().replace(/\s/g, '');
  if (!code) return false;
  const s = await referralSettings();
  if (!s.enabled) return false;
  const ref = await c.query<{ phone: string }>('select phone from referral_codes where code = $1', [code]);
  const referrer = ref.rows[0]?.phone;
  if (!referrer || referrer === referredPhone) return false;
  // Only brand-new members count: this is their first ad
  const earlier = await c.query('select 1 from listings where seller_phone = $1 and id <> $2 limit 1', [referredPhone, listingId]);
  if (earlier.rowCount) return false;
  const r = await c.query(
    `insert into referrals (referrer_phone, referred_phone, listing_id) values ($1, $2, $3) on conflict (referred_phone) do nothing`,
    [referrer, referredPhone, listingId],
  );
  return (r.rowCount ?? 0) > 0;
}

/** Called when an ad is approved. Returns the reward promo code if one was just earned. */
export async function qualifyReferral(listingId: string): Promise<string | null> {
  const row = await q1<{ id: number; referrer_phone: string }>(
    `update referrals r set status = 'qualified', qualified_at = now()
       from listings l where l.id = $1 and r.referred_phone = l.seller_phone and r.status = 'pending'
     returning r.id, r.referrer_phone`,
    [listingId],
  );
  if (!row) return null;
  return giveRewardIfDue(row.referrer_phone);
}

export async function giveRewardIfDue(phone: string): Promise<string | null> {
  const s = await referralSettings();
  return tx(async (c) => {
    await c.query('select pg_advisory_xact_lock(hashtext($1))', [`referral:${phone}`]);
    const counts = await c.query<{ qualified: number; used: number }>(
      `select (select count(*)::int from referrals where referrer_phone = $1 and status = 'qualified') as qualified,
              (select coalesce(sum(referrals_used), 0)::int from referral_rewards where phone = $1) as used`,
      [phone],
    );
    const { qualified, used } = counts.rows[0];
    if (qualified - used < s.needed) return null;
    // Worth one ad of reward_days (the cheapest default price for that length)
    const price = await c.query<{ p: number }>(
      `select coalesce(min(price), 0)::int as p from pricing where is_active and category_id is null and duration_days = $1`,
      [s.reward_days],
    );
    const code = `GIFT${makeCode(6)}`;
    const promo = await c.query<{ id: number }>(
      `insert into promo_codes (code, discount_amount, max_uses, max_uses_per_phone, purposes, only_phone, description, is_active, valid_to)
       values ($1, $2, 1, 1, '{listing}', $3, $4, true, now() + interval '90 days') returning id`,
      [code, price.rows[0].p || 150, phone, `Referral reward: ${s.needed} friends joined (free ${s.reward_days}-day ad)`],
    );
    await c.query('insert into referral_rewards (phone, promo_code_id, referrals_used) values ($1, $2, $3)', [phone, promo.rows[0].id, s.needed]);
    return code;
  });
}

export type ReferralStatus = {
  enabled: boolean;
  code: string;
  needed: number;
  rewardDays: number;
  qualified: number; // towards the next reward
  pending: number;
  rewards: { code: string; used: boolean; validTo: string | null }[];
};

export async function referralStatus(phone: string): Promise<ReferralStatus> {
  const s = await referralSettings();
  const code = await referralCode(phone);
  const [c, rewards] = await Promise.all([
    q1<{ qualified: number; pending: number; used: number }>(
      `select (select count(*)::int from referrals where referrer_phone = $1 and status = 'qualified') as qualified,
              (select count(*)::int from referrals where referrer_phone = $1 and status = 'pending') as pending,
              (select coalesce(sum(referrals_used), 0)::int from referral_rewards where phone = $1) as used`,
      [phone],
    ),
    q<{ code: string; used_count: number; valid_to: Date | null }>(
      `select p.code, p.used_count, p.valid_to from referral_rewards r join promo_codes p on p.id = r.promo_code_id where r.phone = $1 order by r.created_at desc`,
      [phone],
    ),
  ]);
  return {
    enabled: s.enabled,
    code,
    needed: s.needed,
    rewardDays: s.reward_days,
    qualified: Math.max(0, (c?.qualified ?? 0) - (c?.used ?? 0)),
    pending: c?.pending ?? 0,
    rewards: rewards.map((r) => ({ code: r.code, used: r.used_count > 0, validTo: r.valid_to?.toISOString() ?? null })),
  };
}
