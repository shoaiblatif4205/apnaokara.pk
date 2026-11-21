import { brand } from '@apna-okara/shared';

export const colors = brand.colors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 16, full: 999 };

/** Font family for the current language. */
export function fontFor(locale: 'en' | 'ur', bold = false) {
  if (locale === 'ur') return bold ? 'NotoNastaliqUrdu_700Bold' : 'NotoNastaliqUrdu_400Regular';
  return undefined; // system font for English
}
