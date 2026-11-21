// Default prices (Rs). The admin panel's Pricing manager can override these
// per category and per duration. Free Mode is controlled from admin settings.

export const AD_DURATIONS = [7, 10, 15, 20, 25, 30] as const;
export type AdDuration = (typeof AD_DURATIONS)[number];

/** Normal ads: Buy/Sell, Vehicles, Property, Jobs. */
export const DEFAULT_AD_PRICES: Record<AdDuration, number> = {
  7: 150,
  10: 200,
  15: 300,
  20: 350,
  25: 400,
  30: 450,
};

/**
 * Service providers and business listings: ONE-TIME fee, no renewal
 * (listing runs for 10 years). Business Rs 2,000, service providers Rs 1,000.
 */
export const PROVIDER_PLAN = { days: 3650, price: 1000, prices: { services: 1000, business: 2000 } as Record<string, number> };

export const ADDONS = {
  featured: { key: 'featured', price: 200, name: { en: 'Featured', ur: 'فیچرڈ' } },
  whatsapp_boost: { key: 'whatsapp_boost', price: 200, name: { en: 'WhatsApp Group Boost', ur: 'واٹس ایپ گروپ بوسٹ' } },
} as const;

/** Rishta profile fee (admin can change amount and duration). */
export const RISHTA_PROFILE_PLAN = { days: 90, price: 1000 };

export function formatPrice(amount: number, locale: 'en' | 'ur' = 'en'): string {
  const n = new Intl.NumberFormat('en-PK').format(amount);
  return locale === 'ur' ? `${n} روپے` : `Rs ${n}`;
}
