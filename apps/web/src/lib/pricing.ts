import type { PoolClient } from 'pg';
import { durationsFor, isFreeNow, isProviderModel, priceFor, type FreeModeSettings, type PriceRow } from '@apna-okara/shared';
import { q, q1 } from '@/lib/db';
import { UserError } from '@/lib/errors';

// One place that works out what an ad (or an upgrade) costs:
// plan + Featured + WhatsApp Boost - promo code. The website, app and
// admin all use this, so prices are always calculated on the server.

export type AddonKey = 'featured' | 'whatsapp_boost';
export type LineItem = { key: string; label: string; amount: number };
export type Quote = { free: boolean; days: number; items: LineItem[]; subtotal: number; discount: number; total: number; promoId: number | null };

export async function getAddons(): Promise<Record<AddonKey, { price: number; active: boolean; name_en: string; name_ur: string }>> {
  const rows = await q<{ key: AddonKey; price: number; is_active: boolean; name_en: string; name_ur: string }>(
    'select key, price, is_active, name_en, name_ur from addons',
  );
  const out = {} as Record<AddonKey, { price: number; active: boolean; name_en: string; name_ur: string }>;
  for (const r of rows) out[r.key] = { price: r.price, active: r.is_active, name_en: r.name_en, name_ur: r.name_ur };
  return out;
}

/** Check a promo code and return the discount for this amount. Throws UserError if not usable. */
export async function checkPromo(code: string, purpose: string, subtotal: number, phone: string | null): Promise<{ id: number; discount: number }> {
  const p = await q1<{
    id: number; discount_percent: number | null; discount_amount: number | null; max_uses: number | null; used_count: number;
    valid_from: string | null; valid_to: string | null; is_active: boolean; purposes: string[] | null; max_uses_per_phone: number | null; only_phone: string | null;
  }>('select * from promo_codes where upper(code) = upper($1)', [code.trim()]);
  const now = new Date();
  if (!p || !p.is_active) throw new UserError('promo', 'This promo code is not valid');
  if (p.valid_from && new Date(p.valid_from) > now) throw new UserError('promo', 'This promo code has not started yet');
  if (p.valid_to && new Date(p.valid_to) <= now) throw new UserError('promo', 'This promo code has expired');
  if (p.max_uses !== null && p.used_count >= p.max_uses) throw new UserError('promo', 'This promo code has been used up');
  if (p.purposes?.length && !p.purposes.includes(purpose)) throw new UserError('promo', 'This promo code cannot be used here');
  if (p.only_phone && p.only_phone !== phone) throw new UserError('promo', 'This promo code is for another phone number');
  if (phone && p.max_uses_per_phone) {
    const used = await q1<{ n: number }>('select count(*)::int as n from promo_code_uses where promo_code_id = $1 and phone = $2', [p.id, phone]);
    if ((used?.n ?? 0) >= p.max_uses_per_phone) throw new UserError('promo', 'You have already used this promo code');
  }
  const discount = Math.min(subtotal, Math.round((p.discount_amount ?? 0) + (subtotal * (p.discount_percent ?? 0)) / 100));
  return { id: p.id, discount };
}

export async function recordPromoUse(c: PoolClient, promoId: number, paymentId: string, phone: string | null) {
  await c.query('insert into promo_code_uses (promo_code_id, payment_id, phone) values ($1, $2, $3)', [promoId, paymentId, phone]);
  await c.query('update promo_codes set used_count = used_count + 1 where id = $1', [promoId]);
}

/** Price for posting a new ad. */
export async function quoteAd(opts: {
  model: string;
  categoryId: number;
  categorySlug: string;
  days: number;
  featured: boolean;
  boost: boolean;
  promoCode?: string;
  phone: string | null;
  freeMode: FreeModeSettings | null;
  pricing: PriceRow[];
}): Promise<Quote> {
  const free = isFreeNow(opts.freeMode, opts.model, opts.categorySlug);
  const items: LineItem[] = [];
  let days = opts.days;
  if (free) {
    days = opts.freeMode!.days_by_model[opts.model] ?? 30;
  } else {
    if (!durationsFor(opts.model).includes(days)) throw new UserError('plan', 'Choose a valid duration');
    const p = priceFor(opts.pricing, opts.model, opts.categoryId, days);
    if (p === null) throw new UserError('plan', 'This plan is not available');
    items.push({ key: 'plan', label: isProviderModel(opts.model) ? 'One-time listing fee' : `${days} days`, amount: p });
  }
  const addons = await getAddons();
  if (opts.featured) {
    if (!addons.featured?.active) throw new UserError('addon', 'Featured is not available right now');
    items.push({ key: 'featured', label: 'Featured', amount: addons.featured.price });
  }
  if (opts.boost) {
    if (!addons.whatsapp_boost?.active) throw new UserError('addon', 'WhatsApp Boost is not available right now');
    items.push({ key: 'whatsapp_boost', label: 'WhatsApp Group Boost', amount: addons.whatsapp_boost.price });
  }
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  let discount = 0;
  let promoId: number | null = null;
  if (opts.promoCode?.trim() && subtotal > 0) {
    const pr = await checkPromo(opts.promoCode, 'listing', subtotal, opts.phone);
    discount = pr.discount;
    promoId = pr.id;
  }
  return { free, days, items, subtotal, discount, total: subtotal - discount, promoId };
}

/** Price for adding Featured / Boost to a live ad. */
export async function quoteUpgrade(opts: { featured: boolean; boost: boolean; promoCode?: string; phone: string | null }): Promise<Quote> {
  if (!opts.featured && !opts.boost) throw new UserError('addon', 'Choose Featured or WhatsApp Boost');
  const addons = await getAddons();
  const items: LineItem[] = [];
  if (opts.featured) {
    if (!addons.featured?.active) throw new UserError('addon', 'Featured is not available right now');
    items.push({ key: 'featured', label: 'Featured', amount: addons.featured.price });
  }
  if (opts.boost) {
    if (!addons.whatsapp_boost?.active) throw new UserError('addon', 'WhatsApp Boost is not available right now');
    items.push({ key: 'whatsapp_boost', label: 'WhatsApp Group Boost', amount: addons.whatsapp_boost.price });
  }
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  let discount = 0;
  let promoId: number | null = null;
  if (opts.promoCode?.trim()) {
    const pr = await checkPromo(opts.promoCode, opts.featured ? 'featured' : 'whatsapp_boost', subtotal, opts.phone);
    discount = pr.discount;
    promoId = pr.id;
  }
  return { free: false, days: 0, items, subtotal, discount, total: subtotal - discount, promoId };
}
