'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q1, tx } from '@/lib/db';
// (approve/giveFree also switch on paid Featured / WhatsApp Boost)
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { int, str } from '@/lib/admin/form';
import { normalizePhone } from '@/lib/phone';
import { applyFeaturedOnApproval, applyPaymentEffects } from '@/lib/payments';
import { notifyFollowers, notifyListing } from '@/lib/push';
import { qualifyReferral } from '@/lib/referrals';

// Every action keeps the ad and writes to listing_history + activity_log.

/** Push to the seller's phone + followers, and count a referral. Failures never block the approval. */
async function afterApproval(id: string) {
  await Promise.all([
    notifyListing(id, 'ad_approved'),
    notifyFollowers(id),
    qualifyReferral(id).then(async (gift) => {
      if (gift) await logActivity(null, 'referral.reward', 'promo_codes', gift);
    }),
  ]).catch((e) => console.error('[after approval]', e));
}

function back(id: string, error?: string): never {
  revalidatePath('/admin/listings');
  redirect(error ? `/admin/listings/${id}?error=${encodeURIComponent(error)}` : `/admin/listings/${id}?saved=1`);
}

async function history(c: { query: (s: string, p: unknown[]) => Promise<unknown> }, id: string, event: string, adminId: string, details: object = {}) {
  await c.query('insert into listing_history (listing_id, event, details, admin_id) values ($1, $2, $3, $4)', [
    id, event, JSON.stringify(details), adminId,
  ]);
}

export async function approveListing(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const ad = await q1<{ status: string }>('select status from listings where id = $1', [id]);
  if (!ad) back(id, 'Ad not found');
  if (ad!.status !== 'pending') back(id, 'Only pending ads can be approved');
  await tx(async (c) => {
    await c.query(
      `update listings set status = 'approved', approved_at = now(), approved_by = $2, reject_reason = null,
              expires_at = now() + make_interval(days => duration_days)
        where id = $1`,
      [id, admin.id],
    );
    const pays = await c.query<{ id: string }>(
      `update payments set status = case when amount = 0 then 'free'::payment_status else 'verified'::payment_status end,
              verified_by = $2, verified_at = now()
        where listing_id = $1 and status = 'pending' returning id`,
      [id, admin.id],
    );
    for (const p of pays.rows) await applyPaymentEffects(c, p.id, admin.id);
    await applyFeaturedOnApproval(c, id);
    await history(c, id, 'approved', admin.id);
  });
  await logActivity(admin.id, 'listing.approve', 'listings', id);
  await afterApproval(id);
  back(id);
}

export async function rejectListing(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const reason = str(fd, 'reason');
  if (reason.length < 3) back(id, 'Write the reason (the seller will see it).');
  await tx(async (c) => {
    await c.query(`update listings set status = 'rejected', reject_reason = $2 where id = $1 and status = 'pending'`, [id, reason]);
    await c.query(
      `update payments set status = 'rejected', reject_reason = $2, verified_by = $3, verified_at = now()
        where listing_id = $1 and status = 'pending'`,
      [id, reason, admin.id],
    );
    await history(c, id, 'rejected', admin.id, { reason });
  });
  await logActivity(admin.id, 'listing.reject', 'listings', id, { reason });
  await notifyListing(id, 'ad_rejected').catch((e) => console.error('[push]', e));
  back(id);
}

export async function removeListing(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const reason = str(fd, 'reason');
  if (reason.length < 3) back(id, 'Write the reason for removing.');
  await tx(async (c) => {
    await c.query(`update listings set status = 'removed', reject_reason = $2 where id = $1`, [id, reason]);
    await history(c, id, 'removed', admin.id, { reason });
  });
  await logActivity(admin.id, 'listing.remove', 'listings', id, { reason });
  back(id);
}

export async function extendListing(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const days = int(fd, 'days');
  if (days < 1 || days > 365) back(id, 'Days must be from 1 to 365.');
  const ad = await q1<{ status: string; approved_at: string | null }>('select status, approved_at from listings where id = $1', [id]);
  if (!ad?.approved_at || !['approved', 'expired'].includes(ad.status)) back(id, 'Only approved or expired ads can be extended.');
  await tx(async (c) => {
    await c.query(
      `update listings set status = 'approved',
              expires_at = greatest(coalesce(expires_at, now()), now()) + make_interval(days => $2::int)
        where id = $1`,
      [id, days],
    );
    await history(c, id, 'extended', admin.id, { days });
  });
  await logActivity(admin.id, 'listing.extend', 'listings', id, { days });
  back(id);
}

export async function giveFree(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  await tx(async (c) => {
    await c.query('update listings set is_free = true where id = $1', [id]);
    const pays = await c.query<{ id: string }>(
      `update payments set status = 'free', verified_by = $2, verified_at = now() where listing_id = $1 and status = 'pending' returning id`,
      [id, admin.id],
    );
    for (const p of pays.rows) await applyPaymentEffects(c, p.id, admin.id);
    await history(c, id, 'given_free', admin.id);
  });
  await logActivity(admin.id, 'listing.give_free', 'listings', id);
  back(id);
}

export async function markSoldAdmin(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  await tx(async (c) => {
    await c.query(`update listings set status = 'sold', sold_at = now() where id = $1 and status in ('approved', 'pending')`, [id]);
    await history(c, id, 'sold', admin.id, { by: 'admin' });
  });
  await logActivity(admin.id, 'listing.sold', 'listings', id);
  back(id);
}

export async function editListing(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const title = str(fd, 'title');
  const description = str(fd, 'description');
  const priceType = str(fd, 'price_type');
  const priceRaw = str(fd, 'price');
  if (title.length < 5 || title.length > 120) back(id, 'Title must be 5 to 120 letters.');
  if (!['fixed', 'negotiable', 'contact', 'free'].includes(priceType)) back(id, 'Choose a price type.');
  const price = priceType === 'fixed' || priceType === 'negotiable' ? Number.parseInt(priceRaw, 10) : null;
  if (price !== null && !(price > 0)) back(id, 'Enter a valid price.');
  const old = await q1<{ title: string; description: string; price: number | null; price_type: string }>(
    'select title, description, price, price_type from listings where id = $1',
    [id],
  );
  await tx(async (c) => {
    await c.query('update listings set title = $2, description = $3, price = $4, price_type = $5 where id = $1', [
      id, title, description, price, priceType,
    ]);
    await history(c, id, 'edited_by_admin', admin.id, { before: old });
  });
  await logActivity(admin.id, 'listing.edit', 'listings', id);
  back(id);
}

/** Admin gives Featured for some days (free or after a phone/WhatsApp deal). */
export async function makeFeatured(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const days = int(fd, 'days');
  if (days < 0 || days > 365) back(id, 'Days must be from 0 to 365.');
  await tx(async (c) => {
    if (days === 0) {
      await c.query('update listings set is_featured = false, featured_until = null where id = $1', [id]);
    } else {
      await c.query(
        `update listings set is_featured = true, featured_requested = true,
                featured_until = least(coalesce(expires_at, now() + make_interval(days => $2::int)), now() + make_interval(days => $2::int))
          where id = $1`,
        [id, days],
      );
    }
    await history(c, id, days ? 'featured_by_admin' : 'featured_removed', admin.id, { days });
  });
  await logActivity(admin.id, days ? 'listing.feature' : 'listing.unfeature', 'listings', id, { days });
  back(id);
}

/** Admin queues (or clears) a WhatsApp Group Boost. */
export async function boostDone(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  await tx(async (c) => {
    await c.query('update listings set boost_done_at = now(), boost_done_by = $2 where id = $1', [id, admin.id]);
    await history(c, id, 'boost_posted', admin.id);
  });
  await logActivity(admin.id, 'listing.boost_posted', 'listings', id);
  revalidatePath('/admin/boost');
  redirect(str(fd, 'back') || `/admin/listings/${id}?saved=1`);
}

export async function blockPhone(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const phone = normalizePhone(str(fd, 'phone'));
  const reason = str(fd, 'reason') || 'Blocked from ad page';
  if (!phone) back(id, 'Invalid phone number.');
  await q1(
    `insert into blocked_phones (phone, reason, blocked_by) values ($1, $2, $3) on conflict (phone) do nothing`,
    [phone, reason, admin.id],
  );
  await logActivity(admin.id, 'phone.block', 'blocked_phones', phone, { reason, listing_id: id });
  back(id);
}
