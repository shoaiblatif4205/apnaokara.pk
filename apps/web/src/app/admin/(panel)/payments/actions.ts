'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { tx } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { str } from '@/lib/admin/form';
import { applyPaymentEffects } from '@/lib/payments';

// Ad payments (purpose listing / renewal) are verified by approving the ad on its page.
// Upgrades (Featured, Boost) and banners are verified here and switch on at once.

function back(qs: string, error?: string): never {
  revalidatePath('/admin/payments');
  redirect(`/admin/payments?${qs}${error ? `&error=${encodeURIComponent(error)}` : '&saved=1'}`);
}

export async function verifyPayment(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const qs = str(fd, 'qs');
  let effects: string[] = [];
  await tx(async (c) => {
    const p = (await c.query<{ purpose: string; status: string; amount: number }>('select purpose, status, amount from payments where id = $1 for update', [id])).rows[0];
    if (!p || p.status !== 'pending') throw new Error('state');
    if (p.purpose === 'listing' || p.purpose === 'renewal' || p.purpose === 'rishta') throw new Error('listing');
    await c.query(
      `update payments set status = case when amount = 0 then 'free'::payment_status else 'verified'::payment_status end,
              verified_by = $2, verified_at = now() where id = $1`,
      [id, admin.id],
    );
    effects = await applyPaymentEffects(c, id, admin.id);
  }).catch((e: Error) => {
    if (e.message === 'state') back(qs, 'This payment is not pending.');
    if (e.message === 'listing') back(qs, 'Ad and Rishta payments are accepted by approving the ad / profile on its page.');
    throw e;
  });
  await logActivity(admin.id, 'payment.verify', 'payments', id, { effects });
  back(qs);
}

export async function rejectPayment(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const qs = str(fd, 'qs');
  const reason = str(fd, 'reason');
  if (reason.length < 3) back(qs, 'Write why the payment is rejected.');
  await tx(async (c) => {
    const r = await c.query<{ purpose: string; banner_id: string | null }>(
      `update payments set status = 'rejected', reject_reason = $2, verified_by = $3, verified_at = now()
        where id = $1 and status = 'pending' and purpose not in ('listing', 'renewal', 'rishta') returning purpose, banner_id`,
      [id, reason, admin.id],
    );
    if (!r.rowCount) throw new Error('state');
    if (r.rows[0].banner_id) await c.query(`update banners set status = 'rejected', reject_reason = $2 where id = $1`, [r.rows[0].banner_id, reason]);
  }).catch((e: Error) => {
    if (e.message === 'state') back(qs, 'Only pending upgrade/banner payments can be rejected here. Reject ads on the ad page.');
    throw e;
  });
  await logActivity(admin.id, 'payment.reject', 'payments', id, { reason });
  back(qs);
}
