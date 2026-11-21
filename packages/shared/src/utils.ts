import type { Bilingual, Locale } from './types.ts';

/** Pick the right language from a bilingual value. */
export function t(value: Bilingual, locale: Locale): string {
  return value[locale] || value.en;
}

/** URL-friendly slug from English text, e.g. "iPhone 13 128GB" -> "iphone-13-128gb". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Pakistani mobile number to WhatsApp link format: 03001234567 -> 923001234567. */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return '92' + digits.slice(1);
  return digits;
}

/** Valid Pakistani mobile: 03XXXXXXXXX or +923XXXXXXXXX. */
export function isValidPakMobile(phone: string): boolean {
  return /^(?:\+?92|0)3\d{9}$/.test(phone.replace(/[\s-]/g, ''));
}
