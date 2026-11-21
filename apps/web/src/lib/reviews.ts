import { z } from 'zod';
import { q, q1 } from '@/lib/db';
import { LIVE } from '@/lib/public';
import { normalizePhone } from '@/lib/phone';
import { UserError } from '@/lib/errors';

// Ratings and reviews for service providers and businesses.
// Rules: live provider/business only, one review per phone number,
// the provider cannot review themself, reviewer phone is never public.

export type Review = {
  id: number;
  name: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  replyAt: string | null;
  createdAt: string;
};

export async function getReviews(listingId: string, limit = 50): Promise<{ reviews: Review[]; dist: Record<number, number> }> {
  const [rows, dist] = await Promise.all([
    q<{ id: number; reviewer_name: string; rating: number; comment: string | null; provider_reply: string | null; provider_reply_at: string | null; created_at: string }>(
      `select id, reviewer_name, rating, comment, provider_reply, provider_reply_at, created_at
         from reviews where listing_id = $1 and not is_hidden order by created_at desc limit $2`,
      [listingId, limit],
    ),
    q<{ rating: number; n: number }>(
      'select rating, count(*)::int as n from reviews where listing_id = $1 and not is_hidden group by rating',
      [listingId],
    ),
  ]);
  const d: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  dist.forEach((r) => (d[r.rating] = r.n));
  return {
    reviews: rows.map((r) => ({
      id: r.id,
      name: r.reviewer_name,
      rating: r.rating,
      comment: r.comment,
      reply: r.provider_reply,
      replyAt: r.provider_reply_at,
      createdAt: r.created_at,
    })),
    dist: d,
  };
}

const reviewSchema = z.object({
  reference: z.string().regex(/^AO-\d{4,10}$/i),
  name: z.string().trim().min(2).max(60),
  phone: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(''),
});

export async function addReview(input: unknown): Promise<void> {
  const p = reviewSchema.safeParse(input);
  if (!p.success) {
    const f = p.error.issues[0];
    throw new UserError('validation', `${f.path.join('.')}: ${f.message}`);
  }
  const { reference, name, rating, comment } = p.data;
  const phone = normalizePhone(p.data.phone);
  if (!phone) throw new UserError('phone', 'Enter a valid Pakistani mobile number');
  if (await q1('select 1 from blocked_phones where phone = $1', [phone])) throw new UserError('blocked', 'This number cannot post reviews.');

  const ad = await q1<{ id: string; seller_phone: string; whatsapp_phone: string | null }>(
    `select l.id, l.seller_phone, l.whatsapp_phone from listings l
      where l.reference = $1 and l.model in ('services', 'business') and ${LIVE}`,
    [reference.toUpperCase()],
  );
  if (!ad) throw new UserError('not_found', 'Provider not found');
  if (phone === ad.seller_phone || phone === ad.whatsapp_phone) throw new UserError('own', 'You cannot review your own listing.');

  try {
    await q('insert into reviews (listing_id, reviewer_name, reviewer_phone, rating, comment) values ($1, $2, $3, $4, $5)', [
      ad.id, name, phone, rating, comment || null,
    ]);
  } catch (e) {
    if ((e as { code?: string }).code === '23505') throw new UserError('duplicate', 'You have already reviewed this provider from this number.');
    throw e;
  }
}

/** Provider replies to a review on their own listing (proved by reference + phone, see myAdAction). */
export async function replyToReview(listingId: string, reviewId: number, reply: string): Promise<void> {
  const text = reply.trim();
  if (text.length < 2 || text.length > 500) throw new UserError('reply', 'Reply must be 2 to 500 letters');
  const row = await q1('update reviews set provider_reply = $3, provider_reply_at = now() where id = $1 and listing_id = $2 returning id', [
    reviewId, listingId, text,
  ]);
  if (!row) throw new UserError('not_found', 'Review not found');
}
