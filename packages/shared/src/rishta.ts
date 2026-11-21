import type { Bilingual } from './types.ts';

// Choices on the Rishta profile form (value saved in the database + bilingual label).

export type Option = { value: string; label: Bilingual };
const o = (value: string, en: string, ur: string): Option => ({ value, label: { en, ur } });

export const RISHTA_OPTIONS = {
  createdBy: [o('self', 'Myself', 'خود'), o('parent', 'Parent', 'والدین'), o('sibling', 'Brother / sister', 'بہن / بھائی'), o('relative', 'Relative', 'رشتہ دار')],
  gender: [o('male', 'Boy (Larka)', 'لڑکا'), o('female', 'Girl (Larki)', 'لڑکی')],
  maritalStatus: [o('never_married', 'Never married', 'غیر شادی شدہ'), o('divorced', 'Divorced', 'طلاق یافتہ'), o('widowed', 'Widowed', 'بیوہ / رنڈوا')],
  complexion: [o('fair', 'Fair', 'گورا'), o('wheatish', 'Wheatish', 'گندمی'), o('dark', 'Dark', 'سانولا')],
  religion: [o('islam', 'Islam', 'اسلام'), o('christianity', 'Christianity', 'مسیحی'), o('other', 'Other', 'دیگر')],
  sect: [o('sunni', 'Sunni', 'سنی'), o('shia', 'Shia', 'شیعہ'), o('ahl_e_hadith', 'Ahl-e-Hadith', 'اہلِ حدیث'), o('deobandi', 'Deobandi', 'دیوبندی'), o('barelvi', 'Barelvi', 'بریلوی'), o('other', 'Other', 'دیگر')],
  education: [
    o('primary', 'Primary', 'پرائمری'),
    o('matric', 'Matric', 'میٹرک'),
    o('intermediate', 'Intermediate (FA / FSc)', 'انٹرمیڈیٹ'),
    o('bachelors', 'Bachelors (BA / BSc / BS)', 'بیچلرز'),
    o('masters', 'Masters (MA / MSc / MBA)', 'ماسٹرز'),
    o('mphil_phd', 'MPhil / PhD', 'ایم فل / پی ایچ ڈی'),
    o('professional', 'Doctor / Engineer / CA', 'ڈاکٹر / انجینئر / سی اے'),
    o('hafiz_alim', 'Hafiz / Alim', 'حافظ / عالم'),
    o('other', 'Other', 'دیگر'),
  ],
  income: [
    o('none', 'No income / student', 'کوئی آمدن نہیں / طالب علم'),
    o('under_30k', 'Under Rs 30,000', '30 ہزار سے کم'),
    o('30_60k', 'Rs 30,000 – 60,000', '30 سے 60 ہزار'),
    o('60_100k', 'Rs 60,000 – 1 lakh', '60 ہزار سے 1 لاکھ'),
    o('100_200k', 'Rs 1 – 2 lakh', '1 سے 2 لاکھ'),
    o('over_200k', 'Over Rs 2 lakh', '2 لاکھ سے زیادہ'),
  ],
  houseType: [o('own', 'Own house', 'اپنا گھر'), o('rented', 'Rented', 'کرائے کا'), o('family', 'Family house', 'خاندانی گھر')],
  familyType: [o('joint', 'Joint family', 'مشترکہ خاندان'), o('separate', 'Separate family', 'الگ خاندان')],
} as const;

export function optionLabel(list: readonly Option[], value: string | null | undefined, locale: 'en' | 'ur'): string {
  if (!value) return '-';
  return list.find((x) => x.value === value)?.label[locale] ?? value;
}

/** Age in years from a YYYY-MM-DD date of birth. */
export function ageFrom(dob: string | Date, now = new Date()): number {
  const d = new Date(dob);
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** 170 -> 5' 7" */
export function heightLabel(cm: number | null | undefined): string {
  if (!cm) return '-';
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}' ${inches % 12}"`;
}

/** Remove phone numbers, emails and links from free text (privacy rule). */
export function stripContacts(text: string): string {
  return text
    .replace(/https?:\/\/\S+|www\.\S+/gi, '[removed]')
    .replace(/\S+@\S+\.\S+/g, '[removed]')
    .replace(/(\+?\d[\d\s-]{8,}\d)/g, '[removed]');
}
