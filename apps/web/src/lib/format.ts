import { formatPrice } from '@apna-okara/shared';

type T = (key: string, values?: Record<string, string | number>) => string;

/** "Rs 52,000", "Free", "Contact for price" */
export function priceLabel(a: { price: number | null; priceType: string }, locale: 'en' | 'ur', t: T): string {
  if (a.priceType === 'free') return t('free');
  if (!a.price) return t('contactForPrice');
  return formatPrice(a.price, locale);
}

/** "3 hours ago" / "3 گھنٹے پہلے" */
export function timeAgo(iso: string, locale: 'en' | 'ur'): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale === 'ur' ? 'ur' : 'en', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  return rtf.format(Math.round(diff / (86400 * 30)), 'month');
}

export function named(o: { en: string; ur: string } | { name_en: string; name_ur: string }, locale: 'en' | 'ur'): string {
  if ('en' in o) return locale === 'ur' ? o.ur : o.en;
  return locale === 'ur' ? o.name_ur : o.name_en;
}
