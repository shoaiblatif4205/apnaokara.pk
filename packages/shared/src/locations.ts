import type { City, District } from './types.ts';

// Only these areas are allowed on Apna Okara.
// Localities are a STARTING list. The owner should review them, and more
// can be added or edited from the admin panel (Locations manager).

export const districts: District[] = [
  { slug: 'okara', name: { en: 'Okara', ur: 'اوکاڑہ' } },
  { slug: 'sahiwal', name: { en: 'Sahiwal', ur: 'ساہیوال' } },
  { slug: 'pakpattan', name: { en: 'Pakpattan', ur: 'پاکپتن' } },
];

/** Every city also gets an "Other area" locality automatically in the seed. */
export const cities: City[] = [
  // ---- Okara District ----
  {
    slug: 'okara',
    district: 'okara',
    name: { en: 'Okara City', ur: 'اوکاڑہ شہر' },
    localities: [
      { slug: 'satghara-road', name: { en: 'Satghara Road', ur: 'ستگھرہ روڈ' } },
      { slug: 'depalpur-road', name: { en: 'Depalpur Road', ur: 'دیپالپور روڈ' } },
      { slug: 'faisalabad-road', name: { en: 'Faisalabad Road', ur: 'فیصل آباد روڈ' } },
      { slug: 'gt-road', name: { en: 'G.T. Road', ur: 'جی ٹی روڈ' } },
      { slug: 'model-town', name: { en: 'Model Town', ur: 'ماڈل ٹاؤن' } },
      { slug: 'okara-cantt', name: { en: 'Okara Cantt', ur: 'اوکاڑہ کینٹ' } },
      { slug: 'main-bazaar', name: { en: 'Main Bazaar', ur: 'مین بازار' } },
      { slug: 'ghalla-mandi', name: { en: 'Ghalla Mandi', ur: 'غلہ منڈی' } },
    ],
  },
  {
    slug: 'renala-khurd',
    district: 'okara',
    name: { en: 'Renala Khurd', ur: 'رینالہ خورد' },
    localities: [],
  },
  {
    slug: 'depalpur',
    district: 'okara',
    name: { en: 'Depalpur', ur: 'دیپالپور' },
    localities: [],
  },
  {
    slug: 'haveli-lakha',
    district: 'okara',
    name: { en: 'Haveli Lakha', ur: 'حویلی لکھا' },
    localities: [],
  },
  {
    slug: 'basirpur',
    district: 'okara',
    name: { en: 'Basirpur', ur: 'بصیرپور' },
    localities: [],
  },
  {
    slug: 'hujra-shah-muqeem',
    district: 'okara',
    name: { en: 'Hujra Shah Muqeem', ur: 'حجرہ شاہ مقیم' },
    localities: [],
  },

  // ---- Sahiwal District ----
  {
    slug: 'sahiwal',
    district: 'sahiwal',
    name: { en: 'Sahiwal City', ur: 'ساہیوال شہر' },
    localities: [],
  },
  {
    slug: 'chichawatni',
    district: 'sahiwal',
    name: { en: 'Chichawatni', ur: 'چیچہ وطنی' },
    localities: [],
  },
  {
    slug: 'harappa',
    district: 'sahiwal',
    name: { en: 'Harappa', ur: 'ہڑپہ' },
    localities: [],
  },

  // ---- Pakpattan District ----
  {
    slug: 'pakpattan',
    district: 'pakpattan',
    name: { en: 'Pakpattan City', ur: 'پاکپتن شہر' },
    localities: [],
  },
  {
    slug: 'arifwala',
    district: 'pakpattan',
    name: { en: 'Arifwala', ur: 'عارف والا' },
    localities: [],
  },
];

export const OTHER_LOCALITY = {
  slug: 'other',
  name: { en: 'Other area', ur: 'دوسرا علاقہ' },
};

export function findCity(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug);
}
