'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { bool, int, str } from '@/lib/admin/form';
import { setSetting } from '@/lib/settings';
import { giveRewardIfDue } from '@/lib/referrals';

export async function saveReferralSettings(fd: FormData) {
  const admin = await requireAdmin([]);
  const value = { enabled: bool(fd, 'enabled'), needed: Math.min(50, Math.max(1, int(fd, 'needed', 5))), reward_days: [7, 10, 15, 20, 25, 30].includes(int(fd, 'reward_days')) ? int(fd, 'reward_days') : 7 };
  await setSetting('public.referral', value);
  await logActivity(admin.id, 'referral.settings', 'site_settings', 'public.referral', value);
  revalidatePath('/admin/referrals');
  redirect('/admin/referrals?saved=1');
}

/** Mark a referral as not counting (e.g. fake numbers) or count it again. */
export async function setReferralStatus(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = int(fd, 'id');
  let status = str(fd, 'status');
  if (!['rejected', 'qualified', 'pending'].includes(status)) redirect('/admin/referrals');
  // "Count again": counts at once if the new member already has an approved ad
  if (status === 'pending') {
    const ok = await q(
      `select 1 from referrals r join listings l on l.seller_phone = r.referred_phone where r.id = $1 and l.approved_at is not null limit 1`,
      [id],
    );
    if (ok.length) status = 'qualified';
  }
  const r = await q<{ referrer_phone: string }>(
    `update referrals set status = $2, reject_reason = $3, qualified_at = case when $2 = 'qualified' then coalesce(qualified_at, now()) else qualified_at end
      where id = $1 returning referrer_phone`,
    [id, status, status === 'rejected' ? str(fd, 'reason') || 'Not a real new member' : null],
  );
  if (status === 'qualified' && r[0]) await giveRewardIfDue(r[0].referrer_phone);
  await logActivity(admin.id, 'referral.status', 'referrals', id, { status });
  revalidatePath('/admin/referrals');
  redirect('/admin/referrals?saved=1');
}
