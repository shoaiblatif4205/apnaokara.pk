import type { FreeModeSettings, PriceRow } from '@apna-okara/shared';
import { q } from '@/lib/db';
import { getSetting } from '@/lib/settings';

// Everything the Post Ad form needs, read from the database so admin
// changes (categories, fields, cities, prices, free mode) apply at once.

export type MetaField = {
  key: string;
  label_en: string;
  label_ur: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'year';
  options: { en: string; ur: string }[] | null;
  unit_en: string | null;
  unit_ur: string | null;
  is_required: boolean;
};

export type MetaCategory = {
  id: number;
  slug: string;
  model: string;
  name_en: string;
  name_ur: string;
  icon: string | null;
  subcategories: { id: number; slug: string; name_en: string; name_ur: string }[];
  fields: MetaField[];
};

export type MetaCity = {
  id: number;
  slug: string;
  name_en: string;
  name_ur: string;
  localities: { id: number; slug: string; name_en: string; name_ur: string }[];
};

export type PaymentAccounts = {
  // enabled: false = number kept in admin but hidden from customers (missing = shown)
  jazzcash?: { title: string | null; number: string | null; enabled?: boolean };
  easypaisa?: { title: string | null; number: string | null; enabled?: boolean };
  nayapay?: { title: string | null; number: string | null; enabled?: boolean };
  bank?: { bank_name: string | null; title: string | null; account: string | null; iban: string | null; enabled?: boolean };
};

export type Meta = {
  categories: MetaCategory[];
  cities: MetaCity[];
  pricing: PriceRow[];
  freeMode: FreeModeSettings | null;
  paymentAccounts: PaymentAccounts;
  addons: { key: 'featured' | 'whatsapp_boost'; price: number; name_en: string; name_ur: string }[];
};

export async function loadMeta(): Promise<Meta> {
  const [cats, subs, fields, cities, locs, pricing, freeMode, paymentAccounts, addons] = await Promise.all([
    q<Omit<MetaCategory, 'subcategories' | 'fields'>>(
      `select id, slug, model, name_en, name_ur, icon from categories where parent_id is null and is_active order by sort_order, id`,
    ),
    q<{ id: number; parent_id: number; slug: string; name_en: string; name_ur: string }>(
      `select id, parent_id, slug, name_en, name_ur from categories where parent_id is not null and is_active order by sort_order, id`,
    ),
    q<MetaField & { category_id: number }>(
      `select category_id, key, label_en, label_ur, type, options, unit_en, unit_ur, is_required
         from category_fields order by sort_order, id`,
    ),
    q<Omit<MetaCity, 'localities'>>(`select id, slug, name_en, name_ur from cities where is_active order by sort_order, id`),
    q<{ id: number; city_id: number; slug: string; name_en: string; name_ur: string }>(
      `select id, city_id, slug, name_en, name_ur from localities where is_active order by sort_order, id`,
    ),
    q<PriceRow>(`select model::text, category_id, duration_days, price from pricing where is_active`),
    getSetting<FreeModeSettings>('public.free_mode'),
    getSetting<PaymentAccounts>('public.payment_accounts'),
    q<Meta['addons'][number]>(`select key, price, name_en, name_ur from addons where is_active order by price`),
  ]);

  return {
    categories: cats.map((c) => ({
      ...c,
      subcategories: subs.filter((s) => s.parent_id === c.id).map(({ parent_id: _p, ...s }) => s),
      fields: fields.filter((f) => f.category_id === c.id).map(({ category_id: _c, ...f }) => f),
    })),
    cities: cities.map((c) => ({
      ...c,
      localities: locs.filter((l) => l.city_id === c.id).map(({ city_id: _c, ...l }) => l),
    })),
    pricing,
    freeMode,
    paymentAccounts: paymentAccounts ?? {},
    addons,
  };
}

/** Which payment methods have account details filled in. */
export function availableMethods(acc: PaymentAccounts): ('jazzcash' | 'easypaisa' | 'nayapay' | 'bank')[] {
  const out: ('jazzcash' | 'easypaisa' | 'nayapay' | 'bank')[] = [];
  if (acc.jazzcash?.number && acc.jazzcash.enabled !== false) out.push('jazzcash');
  if (acc.easypaisa?.number && acc.easypaisa.enabled !== false) out.push('easypaisa');
  if (acc.nayapay?.number && acc.nayapay.enabled !== false) out.push('nayapay');
  if ((acc.bank?.account || acc.bank?.iban) && acc.bank.enabled !== false) out.push('bank');
  return out;
}
