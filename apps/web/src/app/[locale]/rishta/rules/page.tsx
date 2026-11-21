import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'rishta' });
  return { title: t('rules') };
}

const RULES = {
  en: [
    'Only for families from Okara, Sahiwal and Pakpattan (living in Pakistan or abroad). The person must be 18 or older.',
    'All information must be true. Fake profiles are removed and the number is blocked.',
    'Do not write phone numbers, addresses or links in your profile. Contact is shared only after both families say yes.',
    'Use other families’ photos and details only for finding a rishta. Taking screenshots or sharing them is not allowed.',
    'Be respectful. Report any profile that behaves badly; our team will check it.',
    'Apna Okara only helps families meet. Please check everything yourself before any decision.',
  ],
  ur: [
    'صرف اوکاڑہ، ساہیوال اور پاکپتن کے خاندانوں کے لیے (پاکستان یا بیرونِ ملک)۔ عمر 18 سال یا زیادہ ہونی چاہیے۔',
    'تمام معلومات درست ہونی چاہئیں۔ جعلی پروفائل ہٹا دی جائے گی اور نمبر بلاک ہوگا۔',
    'پروفائل میں فون نمبر، پتہ یا لنک نہ لکھیں۔ رابطہ صرف دونوں خاندانوں کی ہاں کے بعد دیا جاتا ہے۔',
    'دوسرے خاندانوں کی تصاویر اور معلومات صرف رشتہ کے لیے استعمال کریں۔ اسکرین شاٹ لینا یا آگے بھیجنا منع ہے۔',
    'عزت سے پیش آئیں۔ کوئی پروفائل غلط رویہ رکھے تو شکایت کریں، ہماری ٹیم چیک کرے گی۔',
    'اپنا اوکاڑہ صرف خاندانوں کو ملنے میں مدد دیتا ہے۔ کسی فیصلے سے پہلے خود ہر بات کی تحقیق کریں۔',
  ],
};

export default async function RishtaRules(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'rishta' });
  return (
    <div className="container-site max-w-3xl py-6">
      <h1 className="text-2xl font-bold">{t('rules')}</h1>
      <ol className="card mt-4 list-decimal space-y-3 p-6 ps-10">
        {RULES[locale].map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
    </div>
  );
}
