import type { PoolClient } from 'pg';

// What happens when a payment is accepted. Used by "Approve ad" and by the
// Payments manager, so the effect is the same wherever an admin verifies.

type Payment = {
  id: string;
  purpose: string;
  listing_id: string | null;
  banner_id: string | null;
  items: { key: string }[];
  applied_at: string | null;
};

export async function applyPaymentEffects(c: PoolClient, paymentId: string, adminId: string): Promise<string[]> {
  const res = await c.query<Payment>('select id, purpose, listing_id, banner_id, items, applied_at from payments where id = $1 for update', [paymentId]);
  const p = res.rows[0];
  if (!p || p.applied_at) return [];
  const keys = (p.items ?? []).map((i) => i.key);
  const done: string[] = [];

  if (p.listing_id) {
    const ad = (await c.query<{ status: string }>('select status from listings where id = $1', [p.listing_id])).rows[0];
    const live = ad?.status === 'approved';
    if (keys.includes('featured')) {
      // Featured lasts until the ad itself ends. For a new ad it switches on when the ad is approved.
      await c.query(
        `update listings set featured_requested = true,
                is_featured = case when status = 'approved' then true else is_featured end,
                featured_until = case when status = 'approved' then expires_at else featured_until end
          where id = $1`,
        [p.listing_id],
      );
      done.push(live ? 'featured_on' : 'featured_waiting_for_approval');
    }
    if (keys.includes('whatsapp_boost')) {
      await c.query('update listings set boost_requested = true where id = $1', [p.listing_id]);
      done.push('boost_queued');
    }
    if (done.length) {
      await c.query(`insert into listing_history (listing_id, event, details, admin_id) values ($1, 'addons_applied', $2, $3)`, [
        p.listing_id,
        JSON.stringify({ payment_id: p.id, done }),
        adminId,
      ]);
    }
  }

  if (p.banner_id) {
    await c.query(
      `update banners set
          starts_at = case when starts_at is null or starts_at < now() then now() else starts_at end,
          ends_at = case when starts_at is null or starts_at < now() then now() else starts_at end + make_interval(days => coalesce(days, 7)),
          status = case when starts_at is null or starts_at <= now() then 'running'::banner_status else 'scheduled'::banner_status end,
          approved_by = $2, approved_at = now()
        where id = $1`,
      [p.banner_id, adminId],
    );
    done.push('banner_live');
  }

  await c.query('update payments set applied_at = now() where id = $1', [p.id]);
  return done;
}

/** When a new ad is approved: switch on Featured if it was paid for with the ad. */
export async function applyFeaturedOnApproval(c: PoolClient, listingId: string): Promise<void> {
  await c.query(
    `update listings set is_featured = true, featured_until = expires_at
      where id = $1 and featured_requested and status = 'approved'`,
    [listingId],
  );
}
