'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { bool, int, str } from '@/lib/admin/form';

function back(to: string, error?: string): never {
  revalidatePath('/admin/reviews');
  const sep = to.includes('?') ? '&' : '?';
  redirect(error ? `${to}${sep}error=${encodeURIComponent(error)}` : `${to}${sep}saved=1`);
}

/** Hide or show a review. Hidden reviews stay in the records and stop counting in the rating. */
export async function setReviewHidden(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = int(fd, 'id');
  const hide = bool(fd, 'hide') || str(fd, 'hide') === 'true';
  const reason = str(fd, 'reason') || null;
  const row = await q1<{ listing_id: string }>(
    `update reviews set is_hidden = $2, hidden_reason = $3, hidden_by = $4 where id = $1 returning listing_id`,
    [id, hide, hide ? reason : null, hide ? admin.id : null],
  );
  await logActivity(admin.id, hide ? 'review.hide' : 'review.show', 'reviews', id, { listing_id: row?.listing_id, reason });
  back(str(fd, 'back') || '/admin/reviews');
}

/** Remove a provider's public reply (e.g. rude reply). */
export async function clearReply(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = int(fd, 'id');
  await q('update reviews set provider_reply = null, provider_reply_at = null where id = $1', [id]);
  await logActivity(admin.id, 'review.clear_reply', 'reviews', id);
  back(str(fd, 'back') || '/admin/reviews');
}

/** Verified badge for service providers and businesses. */
export async function setVerified(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'listing_id');
  const verified = str(fd, 'verified') === 'true';
  await q(
    `update listings set is_verified = $2, verified_at = case when $2 then now() else null end, verified_by = case when $2 then $3::uuid else null end
      where id = $1 and model in ('services', 'business')`,
    [id, verified, admin.id],
  );
  await q(`insert into listing_history (listing_id, event, admin_id) values ($1, $2, $3)`, [id, verified ? 'verified' : 'unverified', admin.id]);
  await logActivity(admin.id, verified ? 'listing.verify' : 'listing.unverify', 'listings', id);
  revalidatePath('/admin/listings');
  redirect(`/admin/listings/${id}?saved=1`);
}
