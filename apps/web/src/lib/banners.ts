import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { q, q1, tx } from '@/lib/db';
import { UserError } from '@/lib/errors';
import { BadImageError, processPhoto } from '@/lib/images';
import { availableMethods, type PaymentAccounts } from '@/lib/meta';
import { normalizePhone } from '@/lib/phone';
import { checkPromo, recordPromoUse, type LineItem } from '@/lib/pricing';
import { getSetting } from '@/lib/settings';
import { saveObject } from '@/lib/storage';
import { BANNER_PLACEMENTS, PLACEMENT_INFO } from '@/lib/bannerConfig';
import { assertNewPayment, screenshotKey } from '@/lib/paymentProof';

// Brand banner booking (Advertise With Us) and brand stats.

export type BannerSettings = { design_price?: number | null; popup_enabled?: boolean; max_per_placement?: number };

export async function getBannerPrices(): Promise<{ placement: string; days: number; price: number }[]> {
  const [rows, settings] = await Promise.all([
    q<{ placement: string; days: number; price: number }>('select placement, days, price from banner_pricing where is_active order by placement, days'),
    getSetting<BannerSettings>('public.banner_settings'),
  ]);
  return rows.filter((r) => r.placement !== 'popup' || settings?.popup_enabled);
}

export async function quoteBanner(opts: { placement: string; days: number; design: boolean; promoCode?: string; phone: string | null }) {
  const prices = await getBannerPrices();
  const row = prices.find((p) => p.placement === opts.placement && p.days === opts.days);
  if (!row) throw new UserError('plan', 'This place / number of days is not available');
  const settings = await getSetting<BannerSettings>('public.banner_settings');
  const items: LineItem[] = [{ key: 'banner', label: `${PLACEMENT_INFO[opts.placement as keyof typeof PLACEMENT_INFO]?.en ?? opts.placement}, ${opts.days} days`, amount: row.price }];
  if (opts.design) {
    if (settings?.design_price == null) throw new UserError('design', 'Banner design service is not available');
    items.push({ key: 'design', label: 'Banner design', amount: settings.design_price });
  }
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  let discount = 0;
  let promoId: number | null = null;
  if (opts.promoCode?.trim() && subtotal > 0) {
    const pr = await checkPromo(opts.promoCode, 'banner', subtotal, opts.phone);
    discount = pr.discount;
    promoId = pr.id;
  }
  return { items, subtotal, discount, total: subtotal - discount, promoId };
}

const schema = z.object({
  businessName: z.string().trim().min(2).max(80),
  contactName: z.string().trim().min(2).max(80),
  phone: z.string(),
  whatsapp: z.string().optional().default(''),
  placement: z.enum(BANNER_PLACEMENTS),
  days: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  link: z.string().trim().max(300).optional().default(''),
  cityIds: z.array(z.number().int().positive()).max(20).default([]),
  categoryIds: z.array(z.number().int().positive()).max(30).default([]),
  platform: z.enum(['web', 'app', 'both']).default('both'),
  design: z.boolean().default(false),
  title: z.string().trim().max(80).optional().default(''),
  text: z.string().trim().max(120).optional().default(''),
  promoCode: z.string().trim().max(30).optional().default(''),
  payment: z.object({ method: z.enum(['jazzcash', 'easypaisa', 'nayapay', 'bank']), transactionId: z.string().trim().max(40).optional().default(""), paidFrom: z.string().trim().max(80).optional().default('') }).nullable().optional(),
  agree: z.literal(true),
});

type Upload = { size: number; arrayBuffer(): Promise<ArrayBuffer> };
const asUpload = (v: unknown): Upload | null =>
  typeof v === 'object' && v !== null && 'arrayBuffer' in v && 'size' in v && (v as Upload).size > 0 ? (v as Upload) : null;

async function image(u: Upload | null, maxSide: number): Promise<Buffer | null> {
  if (!u) return null;
  if (u.size > 10 * 1024 * 1024) throw new UserError('photo_size', 'Image is too big (max 10 MB)');
  try {
    return await processPhoto(Buffer.from(await u.arrayBuffer()), maxSide);
  } catch (e) {
    if (e instanceof BadImageError) throw new UserError('photo_type', 'Banner must be an image (JPG, PNG, WebP)');
    throw e;
  }
}

export async function createBannerBooking(form: FormData): Promise<{ statsToken: string }> {
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get('data') ?? '{}'));
  } catch {
    throw new UserError('bad_request', 'Invalid form data');
  }
  const p = schema.safeParse(raw);
  if (!p.success) {
    const f = p.error.issues[0];
    throw new UserError('validation', `${f.path.join('.') || 'form'}: ${f.message}`);
  }
  const d = p.data;
  const phone = normalizePhone(d.phone);
  if (!phone) throw new UserError('phone', 'Enter a valid Pakistani mobile number');
  const whatsapp = d.whatsapp ? normalizePhone(d.whatsapp) : null;
  if (d.whatsapp && !whatsapp) throw new UserError('phone', 'Enter a valid WhatsApp number');
  if (await q1('select 1 from blocked_phones where phone = $1', [phone])) throw new UserError('blocked', 'This number cannot book banners.');
  if (d.link && !/^https:\/\//i.test(d.link)) throw new UserError('link', 'Link must start with https://');
  const start = new Date(`${d.startDate}T00:00:00+05:00`);
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }) + 'T00:00:00+05:00');
  if (start < today) throw new UserError('date', 'Start date cannot be in the past');
  if (start.getTime() - today.getTime() > 90 * 86400000) throw new UserError('date', 'Start date must be within 90 days');

  const quote = await quoteBanner({ placement: d.placement, days: d.days, design: d.design, promoCode: d.promoCode, phone });
  const desktop = await image(asUpload(form.get('imageDesktop')), 2000);
  const mobile = await image(asUpload(form.get('imageMobile')), 1200);
  if (!desktop && !d.design) throw new UserError('image', 'Add a banner image or choose the design service');

  let shot: Buffer | null = null;
  if (quote.total > 0) {
    if (!d.payment) throw new UserError('payment', 'Add the payment details');
    const accounts = (await getSetting<PaymentAccounts>('public.payment_accounts')) ?? {};
    if (!availableMethods(accounts).includes(d.payment.method)) throw new UserError('payment', 'This payment method is not available');
    shot = await image(asUpload(form.get('screenshot')), 2000);
    if (!shot) throw new UserError('payment', 'Add the payment screenshot');
    await assertNewPayment(d.payment.method, d.payment.transactionId, shot, { fileTime: form.get('screenshotTime') });
  }

  const id = randomUUID();
  const link = d.link || `tel:${phone}`;
  const paths: Record<string, string | null> = { desktop: null, mobile: null, shot: null };
  if (desktop) {
    paths.desktop = `brand/${id}/desktop-${randomUUID().slice(0, 8)}.webp`;
    await saveObject('banners', paths.desktop, desktop, 'image/webp');
  }
  if (mobile) {
    paths.mobile = `brand/${id}/mobile-${randomUUID().slice(0, 8)}.webp`;
    await saveObject('banners', paths.mobile, mobile, 'image/webp');
  }
  if (shot) {
    paths.shot = screenshotKey(`banners/${id}`, shot);
    await saveObject('payment-screenshots', paths.shot, shot, 'image/webp');
  }

  return tx(async (c) => {
    const b = await c.query<{ stats_token: string }>(
      `insert into banners (id, owner_type, placement, business_name, contact_name, contact_phone, contact_whatsapp, title_en, title_ur,
                            subtitle_en, subtitle_ur, link_url, image_desktop_path, image_mobile_path, target_city_ids, target_category_ids,
                            target_platform, starts_at, days, price, status, needs_design)
       values ($1, 'brand', $2, $3, $4, $5, $6, $7, $7, $8, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'pending', $18)
       returning stats_token`,
      [
        id, d.placement, d.businessName, d.contactName, phone, whatsapp, d.title || d.businessName, d.text || null, link, paths.desktop,
        paths.mobile, d.cityIds.length ? d.cityIds : null, d.categoryIds.length ? d.categoryIds : null, d.platform, start.toISOString(),
        d.days, quote.total, d.design,
      ],
    );
    const pay = await c.query<{ id: string }>(
      `insert into payments (purpose, banner_id, amount, method, transaction_id, paid_from, screenshot_path, status, items, subtotal, discount, promo_code_id)
       values ('banner', $1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10) returning id`,
      [
        id, quote.total, d.payment?.method ?? 'free', d.payment?.transactionId || null, d.payment?.paidFrom || null, paths.shot,
        JSON.stringify(quote.items), quote.subtotal, quote.discount, quote.promoId,
      ],
    );
    if (quote.promoId) await recordPromoUse(c, quote.promoId, pay.rows[0].id, phone);
    return { statsToken: b.rows[0].stats_token };
  });
}

export async function getBannerByToken(token: string) {
  if (!/^[0-9a-f]{24}$/.test(token)) return null;
  const b = await q1<{
    id: string; business_name: string | null; placement: string; status: string; starts_at: string | null; ends_at: string | null; days: number | null;
    image_desktop_path: string | null; reject_reason: string | null;
  }>('select id, business_name, placement, status::text, starts_at, ends_at, days, image_desktop_path, reject_reason from banners where stats_token = $1', [token]);
  if (!b) return null;
  const days = await q<{ day: string; views: number; clicks: number }>(
    `select to_char(day, 'YYYY-MM-DD') as day, views, clicks from banner_stats where banner_id = $1 order by day desc limit 90`,
    [b.id],
  );
  return { ...b, days, totals: days.reduce((a, d) => ({ views: a.views + d.views, clicks: a.clicks + d.clicks }), { views: 0, clicks: 0 }) };
}

/** Count views of banners shown on a page (fire-and-forget). */
export function recordBannerViews(ids: string[]): void {
  if (!ids.length) return;
  q('select add_banner_views($1::uuid[])', [ids]).catch(() => {});
}
