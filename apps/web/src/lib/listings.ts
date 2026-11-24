import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import {
  durationsFor,
  isFreeNow,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  minPhotos,
  priceFor,
  slugify,
} from '@apna-okara/shared';
import { q, q1, tx } from '@/lib/db';
import { BadImageError, processPhoto } from '@/lib/images';
import { availableMethods, loadMeta, type MetaField } from '@/lib/meta';
import { normalizePhone } from '@/lib/phone';
import { saveObject } from '@/lib/storage';

// Creating ads and the seller's "My Ad" actions. Used by the website and
// the mobile app through /api/v1/*. All checks happen here on the server.

import { UserError } from '@/lib/errors';
import { getAddons, quoteAd, quoteUpgrade, recordPromoUse } from '@/lib/pricing';
import { recordReferral, referralStatus, type ReferralStatus } from '@/lib/referrals';
import { getReviews, replyToReview, type Review } from '@/lib/reviews';
import { assertNewPayment, screenshotKey } from '@/lib/paymentProof';
export { UserError };

const paymentSchema = z.object({
  method: z.enum(['jazzcash', 'easypaisa', 'nayapay', 'bank']),
  transactionId: z.string().trim().max(40).optional().default(""),
  paidFrom: z.string().trim().max(80).optional().default(''),
});

const listingSchema = z.object({
  categoryId: z.number().int().positive(),
  subcategoryId: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().max(5000).default(''),
  priceType: z.enum(['fixed', 'negotiable', 'contact', 'free']),
  price: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  cityId: z.number().int().positive(),
  localityId: z.number().int().positive().nullable().optional(),
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  sellerName: z.string().trim().min(2).max(80),
  phone: z.string(),
  whatsapp: z.string().optional().default(''),
  showPhone: z.boolean().default(true),
  durationDays: z.number().int().positive(),
  featured: z.boolean().optional().default(false),
  boost: z.boolean().optional().default(false),
  promoCode: z.string().trim().max(30).optional().default(''),
  referralCode: z.string().trim().max(20).optional().default(''),
  payment: paymentSchema.nullable().optional(),
  agree: z.literal(true),
  locale: z.enum(['en', 'ur']).default('en'),
});

export type ListingInput = z.infer<typeof listingSchema>;

function cleanFields(defs: MetaField[], input: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  const year = new Date().getFullYear();
  for (const f of defs) {
    const v = input[f.key];
    const empty = v === undefined || v === null || v === '';
    if (empty) {
      if (f.is_required && f.type !== 'boolean') throw new UserError('field_required', `${f.label_en} is required`);
      continue;
    }
    if (f.type === 'number' || f.type === 'year') {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) throw new UserError('field_invalid', `${f.label_en} must be a number`);
      if (f.type === 'year' && (n < 1950 || n > year + 1)) throw new UserError('field_invalid', `${f.label_en} is not a valid year`);
      out[f.key] = n;
    } else if (f.type === 'boolean') {
      out[f.key] = v === true || v === 'true' || v === 'on';
    } else if (f.type === 'select') {
      const s = String(v);
      if (!f.options?.some((o) => o.en === s)) throw new UserError('field_invalid', `${f.label_en}: choose from the list`);
      out[f.key] = s;
    } else {
      out[f.key] = String(v).trim().slice(0, 200);
    }
  }
  return out;
}

// Seller manage code: shown once after posting, only its hash is stored.
const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeManageKey = () => Array.from({ length: 8 }, () => KEY_ALPHABET[randomInt(KEY_ALPHABET.length)]).join('');
const hashKey = (key: string) => createHash('sha256').update(`ao-manage:${key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}`).digest('hex');
function keyMatches(hash: string | null, key: string | null | undefined): boolean {
  if (!hash) return true; // ads posted before manage codes existed
  if (!key) return false;
  const a = Buffer.from(hashKey(key), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

type Upload = { name: string; type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };

function isUpload(v: unknown): v is Upload {
  return typeof v === 'object' && v !== null && 'arrayBuffer' in v && 'size' in v;
}

export async function createListing(form: FormData): Promise<{ reference: string; manageKey: string }> {
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get('data') ?? '{}'));
  } catch {
    throw new UserError('bad_request', 'Invalid form data');
  }
  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new UserError('validation', `${first.path.join('.') || 'form'}: ${first.message}`);
  }
  const input = parsed.data;

  const meta = await loadMeta();
  const category = meta.categories.find((c) => c.id === input.categoryId);
  if (!category) throw new UserError('category', 'Choose a valid category');
  if (input.subcategoryId && !category.subcategories.some((s) => s.id === input.subcategoryId)) {
    throw new UserError('category', 'Choose a valid sub-category');
  }
  if (category.subcategories.length && !input.subcategoryId) throw new UserError('category', 'Choose a sub-category');
  const city = meta.cities.find((c) => c.id === input.cityId);
  if (!city) throw new UserError('city', 'Choose a valid city');
  if (input.localityId && !city.localities.some((l) => l.id === input.localityId)) throw new UserError('city', 'Choose a valid area');
  if ((input.priceType === 'fixed' || input.priceType === 'negotiable') && !input.price) {
    throw new UserError('price', 'Enter the price');
  }

  const phone = normalizePhone(input.phone);
  if (!phone) throw new UserError('phone', 'Enter a valid Pakistani mobile number');
  const whatsapp = input.whatsapp ? normalizePhone(input.whatsapp) : phone;
  if (!whatsapp) throw new UserError('phone', 'Enter a valid WhatsApp number');
  if (await q1('select 1 from blocked_phones where phone = $1 or phone = $2', [phone, whatsapp])) {
    throw new UserError('blocked', 'This number cannot post ads. Please contact us.');
  }

  const customFields = cleanFields(category.fields, input.fields);

  // Plan + add-ons + promo (free plan can still have paid add-ons)
  const quote = await quoteAd({
    model: category.model,
    categoryId: category.id,
    categorySlug: category.slug,
    days: input.durationDays,
    featured: input.featured,
    boost: input.boost,
    promoCode: input.promoCode,
    phone,
    freeMode: meta.freeMode,
    pricing: meta.pricing,
  });
  const free = quote.free;
  const duration = quote.days;
  const amount = quote.total;
  const needsPayment = amount > 0;
  if (free) {
    const limit = meta.freeMode!.max_free_ads_per_phone;
    if (limit) {
      const used = await q1<{ n: number }>(
        `select count(*)::int as n from listings where seller_phone = $1 and is_free
            and created_at >= coalesce($2::timestamptz, '-infinity'::timestamptz)`,
        [phone, meta.freeMode!.starts_at],
      );
      if ((used?.n ?? 0) >= limit) throw new UserError('free_limit', `Free ad limit reached for this number (${limit}).`);
    }
  }
  if (needsPayment) {
    if (!input.payment) throw new UserError('payment', 'Add the payment details');
    if (!availableMethods(meta.paymentAccounts).includes(input.payment.method)) {
      throw new UserError('payment', 'This payment method is not available');
    }
  }

  // Photos
  const photos: Upload[] = [];
  for (const v of form.getAll('photos') as unknown[]) if (isUpload(v) && v.size > 0) photos.push(v);
  if (photos.length < minPhotos(category.model)) throw new UserError('photos', 'Add at least one photo');
  if (photos.length > MAX_PHOTOS) throw new UserError('photos', `Maximum ${MAX_PHOTOS} photos`);
  const shotRaw: unknown = form.get('screenshot');
  const screenshot = isUpload(shotRaw) && shotRaw.size > 0 ? shotRaw : null;
  if (needsPayment && !screenshot) throw new UserError('payment', 'Add the payment screenshot');
  for (const f of [...photos, ...(screenshot ? [screenshot] : [])]) {
    if (f.size > MAX_PHOTO_BYTES) throw new UserError('photo_size', 'A photo is too big (max 10 MB)');
  }
  let processed: Buffer[];
  let shot: Buffer | null = null;
  try {
    processed = await Promise.all(photos.map(async (f) => processPhoto(Buffer.from(await f.arrayBuffer()))));
    if (needsPayment && screenshot) shot = await processPhoto(Buffer.from(await screenshot.arrayBuffer()), 2000);
  } catch (e) {
    if (e instanceof BadImageError) throw new UserError('photo_type', 'Only photos (JPG, PNG, WebP, HEIC) can be uploaded');
    throw e;
  }
  if (needsPayment) await assertNewPayment(input.payment!.method, input.payment!.transactionId, shot, { fileTime: form.get('screenshotTime') });

  const slug = `${slugify(input.title) || 'ad'}-${city.slug}`.slice(0, 90);
  const manageKey = makeManageKey();

  return tx(async (c) => {
    const ins = await c.query<{ id: string; reference: string }>(
      `insert into listings (model, category_id, subcategory_id, slug, title, description, price, price_type,
                             city_id, locality_id, custom_fields, seller_name, seller_phone, whatsapp_phone, show_phone,
                             duration_days, is_free, locale, featured_requested, boost_requested, manage_key_hash)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       returning id, reference`,
      [
        category.model, category.id, input.subcategoryId ?? null, slug, input.title, input.description,
        input.priceType === 'contact' || input.priceType === 'free' ? null : input.price ?? null, input.priceType,
        city.id, input.localityId ?? null, JSON.stringify(customFields), input.sellerName, phone, whatsapp, input.showPhone,
        duration, free, input.locale, input.featured, input.boost, hashKey(manageKey),
      ],
    );
    const { id, reference } = ins.rows[0];

    for (let i = 0; i < processed.length; i++) {
      const key = `${id}/${i + 1}-${randomUUID().slice(0, 8)}.webp`;
      await saveObject('listing-images', key, processed[i], 'image/webp', c);
      await c.query('insert into listing_images (listing_id, storage_path, sort_order, is_cover) values ($1, $2, $3, $4)', [
        id, key, i, i === 0,
      ]);
    }

    let shotKey: string | null = null;
    if (shot) {
      shotKey = screenshotKey(id, shot);
      await saveObject('payment-screenshots', shotKey, shot, 'image/webp', c);
    }
    const pay = await c.query<{ id: string }>(
      `insert into payments (purpose, listing_id, amount, method, transaction_id, paid_from, screenshot_path, status, items, subtotal, discount, promo_code_id)
       values ('listing', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
      needsPayment
        ? [id, amount, input.payment!.method, input.payment!.transactionId || null, input.payment!.paidFrom || null, shotKey, 'pending',
            JSON.stringify(quote.items), quote.subtotal, quote.discount, quote.promoId]
        : [id, 0, 'free', null, null, null, free ? 'free' : 'pending', JSON.stringify(quote.items), quote.subtotal, quote.discount, quote.promoId],
    );
    if (quote.promoId) await recordPromoUse(c, quote.promoId, pay.rows[0].id, phone);
    const referred = input.referralCode ? await recordReferral(c, input.referralCode, phone, id) : false;
    await c.query(`insert into listing_history (listing_id, event, details) values ($1, 'created', $2)`, [
      id,
      JSON.stringify({ free, duration, amount, discount: quote.discount, items: quote.items.map((i) => i.key), photos: processed.length, referred }),
    ]);
    return { reference, manageKey };
  });
}

// ---------------- My Ad (seller, no login) ----------------

export type MyAd = {
  reference: string;
  title: string;
  status: string;
  rejectReason: string | null;
  model: string;
  categoryName: { en: string; ur: string };
  cityName: { en: string; ur: string };
  price: number | null;
  priceType: string;
  createdAt: string;
  approvedAt: string | null;
  expiresAt: string | null;
  durationDays: number;
  coverUrl: string | null;
  canMarkSold: boolean;
  canRenew: boolean;
  renew: { free: boolean; durations: { days: number; price: number | null }[] };
  /** Add Featured / WhatsApp Boost to a live ad (null = not possible now). */
  upgrade: { featured: number | null; boost: number | null; pending: boolean } | null;
  /** Service providers / businesses: their reviews so they can reply. */
  reviews: Review[] | null;
  rating: { avg: number; count: number } | null;
  /** Invite friends: code and progress towards a free ad. */
  referral: ReferralStatus | null;
  /** The secret manage code was given (needed to mark sold and reply to reviews). */
  canManage: boolean;
};

async function findOwned(reference: string, phoneInput: string) {
  const phone = normalizePhone(phoneInput);
  const ref = reference.trim().toUpperCase();
  if (!phone || !/^AO-\d{4,10}$/.test(ref)) return null;
  return q1<{
    id: string; reference: string; title: string; status: string; reject_reason: string | null; model: string;
    category_id: number; cat_slug: string; cat_en: string; cat_ur: string; city_en: string; city_ur: string;
    price: number | null; price_type: string; created_at: string; approved_at: string | null; expires_at: string | null;
    duration_days: number; cover: string | null; rating_avg: string; rating_count: number;
    is_featured: boolean; featured_until: string | null; boost_requested: boolean; manage_key_hash: string | null;
  }>(
    `select l.id, l.reference, l.title, l.status, l.reject_reason, l.model, l.category_id, c.slug as cat_slug,
            l.rating_avg, l.rating_count, l.is_featured, l.featured_until, l.boost_requested, l.manage_key_hash,
            c.name_en as cat_en, c.name_ur as cat_ur, ci.name_en as city_en, ci.name_ur as city_ur,
            l.price, l.price_type, l.created_at, l.approved_at, l.expires_at, l.duration_days,
            (select storage_path from listing_images i where i.listing_id = l.id and i.is_cover and i.deleted_at is null limit 1) as cover
       from listings l join categories c on c.id = l.category_id join cities ci on ci.id = l.city_id
      where l.reference = $1 and l.seller_phone = $2`,
    [ref, phone],
  );
}

export async function getMyAd(reference: string, phone: string, key?: string | null): Promise<MyAd | null> {
  const ad = await findOwned(reference, phone);
  if (!ad) return null;
  const meta = await loadMeta();
  const free = isFreeNow(meta.freeMode, ad.model, ad.cat_slug);
  const live = ad.status === 'approved' && (!ad.expires_at || new Date(ad.expires_at) > new Date());
  const provider = ad.model === 'services' || ad.model === 'business';
  const reviews = provider ? (await getReviews(ad.id, 100)).reviews : null;
  let upgrade: MyAd['upgrade'] = null;
  if (live) {
    const [addons, pending] = await Promise.all([
      getAddons(),
      q1(`select 1 from payments where listing_id = $1 and purpose in ('featured', 'whatsapp_boost') and status = 'pending'`, [ad.id]),
    ]);
    const featuredNow = ad.is_featured && (!ad.featured_until || new Date(ad.featured_until) > new Date());
    upgrade = {
      featured: !featuredNow && addons.featured?.active ? addons.featured.price : null,
      boost: !ad.boost_requested && addons.whatsapp_boost?.active ? addons.whatsapp_boost.price : null,
      pending: !!pending,
    };
  }
  const referral = await referralStatus(normalizePhone(phone)!).catch(() => null);
  return {
    referral: referral?.enabled ? referral : null,
    canManage: keyMatches(ad.manage_key_hash, key),
    upgrade,
    reviews,
    rating: provider ? { avg: Number(ad.rating_avg), count: ad.rating_count } : null,
    reference: ad.reference,
    title: ad.title,
    status: ad.status === 'approved' && !live ? 'expired' : ad.status,
    rejectReason: ad.reject_reason,
    model: ad.model,
    categoryName: { en: ad.cat_en, ur: ad.cat_ur },
    cityName: { en: ad.city_en, ur: ad.city_ur },
    price: ad.price,
    priceType: ad.price_type,
    createdAt: ad.created_at,
    approvedAt: ad.approved_at,
    expiresAt: ad.expires_at,
    durationDays: ad.duration_days,
    coverUrl: ad.cover ? `/api/files/listing-images/${ad.cover}` : null,
    canMarkSold: ad.status === 'approved' || ad.status === 'pending',
    canRenew: ad.status === 'expired' || (ad.status === 'approved' && !live),
    renew: {
      free,
      durations: free
        ? [{ days: meta.freeMode!.days_by_model[ad.model] ?? 30, price: 0 }]
        : durationsFor(ad.model).map((d) => ({ days: d, price: priceFor(meta.pricing, ad.model, ad.category_id, d) })),
    },
  };
}

export async function myAdAction(form: FormData): Promise<void> {
  const reference = String(form.get('reference') ?? '');
  const phone = String(form.get('phone') ?? '');
  const action = String(form.get('action') ?? '');
  const ad = await findOwned(reference, phone);
  if (!ad) throw new UserError('not_found', 'Ad not found');

  const needsKey = action === 'sold' || action === 'reply';
  if (needsKey && !keyMatches(ad.manage_key_hash, String(form.get('key') ?? ''))) {
    throw new UserError('manage_key', 'Enter the secret code you got when you posted this ad.');
  }

  if (action === 'sold') {
    if (ad.status !== 'approved' && ad.status !== 'pending') throw new UserError('state', 'This ad cannot be marked as sold');
    await tx(async (c) => {
      await c.query(`update listings set status = 'sold', sold_at = now() where id = $1`, [ad.id]);
      await c.query(`insert into listing_history (listing_id, event, details) values ($1, 'sold', '{"by":"seller"}')`, [ad.id]);
    });
    return;
  }

  if (action === 'edit') {
    const message = String(form.get('message') ?? '').trim();
    if (message.length < 3 || message.length > 1000) throw new UserError('message', 'Write what to change (3 to 1000 letters)');
    await q(`insert into listing_history (listing_id, event, details) values ($1, 'edit_requested', $2)`, [
      ad.id,
      JSON.stringify({ message }),
    ]);
    return;
  }

  if (action === 'upgrade') {
    const info = await getMyAd(reference, phone);
    if (!info?.upgrade) throw new UserError('state', 'Only live ads can be upgraded');
    if (info.upgrade.pending) throw new UserError('state', 'You already have an upgrade waiting for approval');
    const featured = form.get('featured') === 'true' && info.upgrade.featured !== null;
    const boost = form.get('boost') === 'true' && info.upgrade.boost !== null;
    const ownerPhone = normalizePhone(phone);
    const quote = await quoteUpgrade({ featured, boost, promoCode: String(form.get('promoCode') ?? ''), phone: ownerPhone });
    let shotKey: string | null = null;
    let payment: z.infer<typeof paymentSchema> | null = null;
    if (quote.total > 0) {
      const p = paymentSchema.safeParse({ method: form.get('method'), transactionId: form.get('transactionId') ?? '', paidFrom: form.get('paidFrom') ?? '' });
      if (!p.success) throw new UserError('payment', 'Add the payment details');
      payment = p.data;
      const meta = await loadMeta();
      if (!availableMethods(meta.paymentAccounts).includes(payment.method)) throw new UserError('payment', 'This payment method is not available');
      const shot: unknown = form.get('screenshot');
      if (!isUpload(shot) || shot.size === 0) throw new UserError('payment', 'Add the payment screenshot');
      if (shot.size > MAX_PHOTO_BYTES) throw new UserError('photo_size', 'Screenshot is too big (max 10 MB)');
      try {
        const buf = await processPhoto(Buffer.from(await shot.arrayBuffer()), 2000);
        await assertNewPayment(payment.method, payment.transactionId, buf, { fileTime: form.get('screenshotTime') });
        shotKey = screenshotKey(ad.id, buf);
        await saveObject('payment-screenshots', shotKey, buf, 'image/webp');
      } catch (e) {
        if (e instanceof BadImageError) throw new UserError('photo_type', 'Screenshot must be a photo');
        throw e;
      }
    }
    await tx(async (c) => {
      const pay = await c.query<{ id: string }>(
        `insert into payments (purpose, listing_id, amount, method, transaction_id, paid_from, screenshot_path, status, items, subtotal, discount, promo_code_id)
         values ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, $11) returning id`,
        [
          featured ? 'featured' : 'whatsapp_boost', ad.id, quote.total, payment?.method ?? 'free', payment?.transactionId || null,
          payment?.paidFrom || null, shotKey, JSON.stringify(quote.items), quote.subtotal, quote.discount, quote.promoId,
        ],
      );
      if (quote.promoId) await recordPromoUse(c, quote.promoId, pay.rows[0].id, ownerPhone);
      await c.query(`insert into listing_history (listing_id, event, details) values ($1, 'upgrade_requested', $2)`, [
        ad.id,
        JSON.stringify({ featured, boost, amount: quote.total }),
      ]);
    });
    return;
  }

  if (action === 'reply') {
    if (ad.model !== 'services' && ad.model !== 'business') throw new UserError('state', 'Only providers can reply to reviews');
    await replyToReview(ad.id, Number(form.get('reviewId')), String(form.get('reply') ?? ''));
    await q(`insert into listing_history (listing_id, event, details) values ($1, 'review_reply', $2)`, [
      ad.id,
      JSON.stringify({ review_id: Number(form.get('reviewId')) }),
    ]);
    return;
  }

  if (action === 'renew') {
    const info = await getMyAd(reference, phone);
    if (!info?.canRenew) throw new UserError('state', 'Only expired ads can be renewed');
    const days = Number(form.get('durationDays'));
    const option = info.renew.durations.find((d) => d.days === days);
    if (!option || option.price === null) throw new UserError('plan', 'Choose a valid duration');
    let shotKey: string | null = null;
    let payment: z.infer<typeof paymentSchema> | null = null;
    if (!info.renew.free) {
      const p = paymentSchema.safeParse({
        method: form.get('method'),
        transactionId: form.get('transactionId') ?? '',
        paidFrom: form.get('paidFrom') ?? '',
      });
      if (!p.success) throw new UserError('payment', 'Add the payment details');
      payment = p.data;
      const meta = await loadMeta();
      if (!availableMethods(meta.paymentAccounts).includes(payment.method)) throw new UserError('payment', 'This payment method is not available');
      const shot: unknown = form.get('screenshot');
      if (!isUpload(shot) || shot.size === 0) throw new UserError('payment', 'Add the payment screenshot');
      if (shot.size > MAX_PHOTO_BYTES) throw new UserError('photo_size', 'Screenshot is too big (max 10 MB)');
      try {
        const buf = await processPhoto(Buffer.from(await shot.arrayBuffer()), 2000);
        await assertNewPayment(payment!.method, payment!.transactionId, buf, { fileTime: form.get('screenshotTime') });
        shotKey = screenshotKey(ad.id, buf);
        await saveObject('payment-screenshots', shotKey, buf, 'image/webp');
      } catch (e) {
        if (e instanceof BadImageError) throw new UserError('photo_type', 'Screenshot must be a photo');
        throw e;
      }
    }
    await tx(async (c) => {
      await c.query(
        `update listings set status = 'pending', duration_days = $2, is_free = $3, reject_reason = null where id = $1`,
        [ad.id, days, info.renew.free],
      );
      await c.query(
        `insert into payments (purpose, listing_id, amount, method, transaction_id, paid_from, screenshot_path, status)
         values ('renewal', $1, $2, $3, $4, $5, $6, $7)`,
        info.renew.free
          ? [ad.id, 0, 'free', null, null, null, 'free']
          : [ad.id, option.price, payment!.method, payment!.transactionId || null, payment!.paidFrom || null, shotKey, 'pending'],
      );
      await c.query(`insert into listing_history (listing_id, event, details) values ($1, 'renewal_requested', $2)`, [
        ad.id,
        JSON.stringify({ days, free: info.renew.free, amount: option.price }),
      ]);
    });
    return;
  }

  throw new UserError('bad_request', 'Unknown action');
}
