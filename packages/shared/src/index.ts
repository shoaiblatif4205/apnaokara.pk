export * from './types.ts';
export * from './locations.ts';
export * from './categories.ts';
export * from './pricing.ts';
export * from './brand.ts';
export * from './utils.ts';
export * from './listing.ts';
export * from './rishta.ts';
export { en } from './i18n/en.ts';
export type { Messages } from './i18n/en.ts';
export { ur } from './i18n/ur.ts';

import { en } from './i18n/en.ts';
import { ur } from './i18n/ur.ts';
import type { Locale } from './types.ts';

export const LOCALES: Locale[] = ['en', 'ur'];
export const DEFAULT_LOCALE: Locale = 'en';
export const messages = { en, ur };

/** Urdu is written right-to-left. */
export function dir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ur' ? 'rtl' : 'ltr';
}
