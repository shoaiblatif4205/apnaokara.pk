import type { ModelType } from './types.ts';
import { AD_DURATIONS, PROVIDER_PLAN } from './pricing.ts';

// Rules shared by the website, the app and the server.

export type FreeModeSettings = {
  enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  days_by_model: Record<string, number>;
  models: string[];
  category_slugs: string[] | null;
  max_free_ads_per_phone: number | null;
  banner: { en: string; ur: string };
};

/** Is Free Mode active right now for this model / category? */
export function isFreeNow(fm: FreeModeSettings | null | undefined, model: string, categorySlug: string, now = new Date()): boolean {
  if (!fm?.enabled) return false;
  if (fm.starts_at && new Date(fm.starts_at) > now) return false;
  if (fm.ends_at && new Date(fm.ends_at) <= now) return false;
  if (!fm.models.includes(model)) return false;
  if (fm.category_slugs && fm.category_slugs.length && !fm.category_slugs.includes(categorySlug)) return false;
  return true;
}

/** Service providers and businesses pay for a fixed 2-month plan; others choose days. */
export function isProviderModel(model: ModelType | string): boolean {
  return model === 'services' || model === 'business';
}

/** Duration choices for a model (days). */
export function durationsFor(model: ModelType | string): number[] {
  return isProviderModel(model) ? [PROVIDER_PLAN.days] : [...AD_DURATIONS];
}

export type PriceRow = { model: string | null; category_id: number | null; duration_days: number; price: number };

/** Price for a model/category/duration: a category override wins over the model default. */
export function priceFor(rows: PriceRow[], model: string, categoryId: number, days: number): number | null {
  const override = rows.find((r) => r.category_id === categoryId && r.duration_days === days);
  if (override) return override.price;
  const base = rows.find((r) => r.category_id === null && r.model === model && r.duration_days === days);
  return base ? base.price : null;
}

/** Photos: buy/sell, vehicles and property need at least one. */
export function minPhotos(model: ModelType | string): number {
  return model === 'buy_sell' || model === 'vehicles' || model === 'property' ? 1 : 0;
}

export const MAX_PHOTOS = 8;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB before compression

/** Ready-made text for posting an approved ad in the WhatsApp group. */
export function whatsappPostText(ad: { title: string; price: number | null; priceType: string; city: string; reference: string; url: string }): string {
  const price = ad.priceType === 'free' ? 'Free' : ad.price ? `Rs ${new Intl.NumberFormat('en-PK').format(ad.price)}` : 'Contact for price';
  return `🛒 ${ad.title}\n💰 ${price}\n📍 ${ad.city}\n🔖 ${ad.reference}\n\n👉 ${ad.url}\n\nApna Okara · apnaokara.pk`;
}
