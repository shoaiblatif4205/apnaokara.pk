// Starting text for the info and legal pages (Markdown). Shown until the owner
// writes their own text in Admin → Pages. Legal pages are a plain-language
// starting point and should be reviewed by the owner before launch.

type Page = { title: { en: string; ur: string }; body: { en: string; ur: string }; needsOwner?: boolean };

export const PAGE_SLUGS = [
  'about', 'contact', 'how-it-works', 'faq', 'pricing', 'safety', 'community', 'download',
  'terms', 'privacy', 'posting-rules', 'refund-policy', 'disclaimer',
] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export const DEFAULT_PAGES: Record<PageSlug, Page> = {
  about: {
    title: { en: 'About Apna Okara', ur: 'اپنا اوکاڑہ کے بارے میں' },
    body: {
      en: `**Apna Okara** is the local online marketplace of **Okara, Sahiwal and Pakpattan**. One trusted place where people of our own area buy and sell, find work, hire skilled people, discover local businesses and look for a rishta, in Urdu or English.

## Our story
Apna Okara was started by **Shagufta Latif**, from Okara. On big national websites, a bike in Okara gets lost between thousands of ads from Lahore and Karachi, a good plumber is found only through someone who knows someone, and families have no safe place to search for a rishta close to home.

So we built a marketplace only for our own districts: simple enough for everyone, in our own language, and checked by real people from our own area.

## What we promise
- **Every ad is checked** by our team before it goes live. Fake, copied and prohibited ads are removed.
- **Payments are verified by hand.** Nothing goes live until we confirm the money in our account.
- **Your privacy is protected.** We never sell your data. In Rishta, names and numbers are never shown, and contact is shared only when both families agree.
- **Real local help.** Call or WhatsApp us; a real person from our team replies.

## What you can do here
- Buy and sell mobiles, bikes, cars, furniture, electronics and mawaishi
- Find houses and shops for rent, plots and land for sale
- Find jobs, or find staff for your shop or office
- Find trusted plumbers, electricians, mechanics, tutors and other service providers, with ratings and reviews
- Find local shops, clinics, schools and businesses
- Find a rishta in a private and respectful way

## Our areas
Okara City, Renala Khurd, Depalpur, Haveli Lakha, Basirpur, Hujra Shah Muqeem, Sahiwal, Chichawatni, Harappa, Pakpattan and Arifwala.

## Talk to us
Call or WhatsApp **0307 2849373**, or email **apnaokarapk@gmail.com**. You can also send a message from the [Contact us](/contact) page.`,
      ur: `**اپنا اوکاڑہ** اوکاڑہ، ساہیوال اور پاکپتن کا اپنا آن لائن بازار ہے۔ ایک قابلِ اعتماد جگہ جہاں ہمارے اپنے علاقے کے لوگ خرید و فروخت کرتے ہیں، نوکری ڈھونڈتے ہیں، کاریگر تلاش کرتے ہیں، مقامی کاروبار دیکھتے ہیں اور رشتہ تلاش کرتے ہیں، اردو یا انگریزی میں۔

## ہماری کہانی
اپنا اوکاڑہ کی بنیاد **شگفتہ لطیف** نے رکھی، جن کا تعلق اوکاڑہ سے ہے۔ بڑی قومی ویب سائٹس پر اوکاڑہ کی ایک بائیک لاہور اور کراچی کے ہزاروں اشتہاروں میں گم ہو جاتی ہے، اچھا پلمبر صرف جان پہچان سے ملتا ہے، اور خاندانوں کے پاس اپنے قریب رشتہ تلاش کرنے کی کوئی محفوظ جگہ نہیں۔

اسی لیے ہم نے صرف اپنے اضلاع کے لیے ایک بازار بنایا: ہر کسی کے لیے آسان، اپنی زبان میں، اور اپنے ہی علاقے کے لوگوں کی نگرانی میں۔

## ہمارا وعدہ
- **ہر اشتہار چیک ہوتا ہے** لائیو ہونے سے پہلے۔ جعلی، کاپی شدہ اور ممنوعہ اشتہار ہٹا دیے جاتے ہیں۔
- **ادائیگی ہاتھ سے تصدیق ہوتی ہے۔** جب تک رقم ہمارے اکاؤنٹ میں نہ آ جائے، کچھ لائیو نہیں ہوتا۔
- **آپ کی پرائیویسی محفوظ ہے۔** ہم آپ کا ڈیٹا کبھی نہیں بیچتے۔ رشتہ میں نام اور نمبر کبھی نہیں دکھائے جاتے، اور رابطہ صرف دونوں خاندانوں کی ہاں کے بعد ملتا ہے۔
- **اصل مقامی مدد۔** ہمیں کال یا واٹس ایپ کریں، ہماری ٹیم کا ایک اصل فرد جواب دیتا ہے۔

## یہاں آپ کیا کر سکتے ہیں
- موبائل، بائیک، گاڑیاں، فرنیچر، الیکٹرانکس اور مویشی خریدیں اور بیچیں
- کرائے کے مکان اور دکانیں، پلاٹ اور زمین تلاش کریں
- نوکری تلاش کریں یا اپنی دکان یا دفتر کے لیے عملہ ڈھونڈیں
- ریٹنگ اور تبصروں کے ساتھ قابلِ اعتماد پلمبر، الیکٹریشن، مکینک، ٹیوٹر اور دوسرے کاریگر
- مقامی دکانیں، کلینک، اسکول اور کاروبار تلاش کریں
- محفوظ اور باعزت طریقے سے رشتہ تلاش کریں

## ہمارے علاقے
اوکاڑہ شہر، رینالہ خورد، دیپالپور، حویلی لکھا، بصیرپور، حجرہ شاہ مقیم، ساہیوال، چیچہ وطنی، ہڑپہ، پاکپتن اور عارف والا۔

## ہم سے بات کریں
کال یا واٹس ایپ کریں **0307 2849373**، یا ای میل کریں **apnaokarapk@gmail.com**۔ آپ [رابطہ کریں](/contact) صفحے سے پیغام بھی بھیج سکتے ہیں۔`,
    },
  },
  contact: {
    title: { en: 'Contact us', ur: 'رابطہ کریں' },
    body: {
      en: 'Questions about an ad, a payment or advertising? Send us a message and our team will reply. You can also reach us on WhatsApp.',
      ur: 'کسی اشتہار، ادائیگی یا تشہیر کے بارے میں سوال ہے؟ ہمیں پیغام بھیجیں، ہماری ٹیم جواب دے گی۔ آپ واٹس ایپ پر بھی رابطہ کر سکتے ہیں۔',
    },
  },
  'how-it-works': {
    title: { en: 'How it works', ur: 'طریقہ کار' },
    body: {
      en: `## Posting an ad
1. Tap **Post Ad** and choose a category.
2. Add a clear title, details, price and photos.
3. Choose how many days the ad should run and pay (or post free during offers).
4. Our team checks the ad and makes it live, usually the same day.
5. Save your **reference number** (like AO-10001). Use it in **My Ads** to see the status, mark as sold or renew.

## Buying
1. Search or open a category, and use filters for city, price and more.
2. Open the ad and contact the seller on **WhatsApp** or by phone.
3. Meet in a public place, check the item, then pay.

## Service providers and businesses
List your service (one-time Rs 1,000) or business (one-time Rs 2,000): no monthly fee, no renewal. Customers can call you, message you on WhatsApp and leave reviews. A **Verified** badge is given after our team checks you.

## Rishta
Make a private profile with your phone number. Our team calls to verify it. Families send interest, and numbers are shared only when both say yes.`,
      ur: `## اشتہار لگانا
1. **اشتہار لگائیں** دبائیں اور کیٹیگری منتخب کریں۔
2. صاف عنوان، تفصیل، قیمت اور تصاویر لگائیں۔
3. اشتہار کتنے دن چلے منتخب کریں اور ادائیگی کریں (آفر کے دنوں میں مفت)۔
4. ہماری ٹیم اشتہار چیک کر کے لائیو کر دیتی ہے، عام طور پر اسی دن۔
5. اپنا **ریفرنس نمبر** (جیسے AO-10001) محفوظ کریں۔ **میرے اشتہار** میں اس سے اسٹیٹس دیکھیں، بک گیا لگائیں یا دوبارہ لگائیں۔

## خریدنا
1. تلاش کریں یا کیٹیگری کھولیں، اور شہر، قیمت وغیرہ کے فلٹر لگائیں۔
2. اشتہار کھولیں اور بیچنے والے سے **واٹس ایپ** یا فون پر رابطہ کریں۔
3. عوامی جگہ پر ملیں، چیز دیکھیں، پھر ادائیگی کریں۔

## کاریگر اور کاروبار
اپنی سروس (ایک بار 1,000 روپے) یا کاروبار (ایک بار 2,000 روپے) لسٹ کریں: نہ ماہانہ فیس، نہ دوبارہ لگانے کی ضرورت۔ گاہک آپ کو کال یا واٹس ایپ کر سکتے ہیں اور تبصرے لکھ سکتے ہیں۔ ہماری ٹیم کی تصدیق کے بعد **تصدیق شدہ** نشان ملتا ہے۔

## رشتہ
اپنے فون نمبر سے نجی پروفائل بنائیں۔ ہماری ٹیم تصدیق کے لیے کال کرتی ہے۔ خاندان دلچسپی بھیجتے ہیں، اور نمبر صرف دونوں کی ہاں کے بعد ملتا ہے۔`,
    },
  },
  faq: {
    title: { en: 'Frequently asked questions', ur: 'عام سوالات' },
    body: {
      en: `### Is Apna Okara only for Okara?
It is for Okara, Sahiwal and Pakpattan districts, including Renala Khurd, Depalpur, Chichawatni, Arifwala and nearby towns.

### Do I need an account to post an ad?
No. You only need a phone number. After posting you get a reference number to manage your ad.

### How much does an ad cost?
Ads start from Rs 150 for 7 days. Service providers pay a one-time Rs 1,000 and businesses a one-time Rs 2,000. See the Pricing page. Sometimes ads are free during offers.

### How long does approval take?
Usually the same day. You can check the status in My Ads with your reference number and phone.

### Why was my ad rejected?
The reason is shown in My Ads. Common reasons: unclear photos, wrong category, or a prohibited item. Fix it and post again.

### How do I remove my ad after selling?
Open My Ads, enter your reference number and phone, and tap Mark as sold.

### How do I pay?
By JazzCash, Easypaisa or bank transfer. Add the transaction ID and a screenshot when posting.

### Is Rishta private?
Yes. Names and numbers are never shown, photos are blurred, and numbers are shared only when both families say yes.`,
      ur: `### کیا اپنا اوکاڑہ صرف اوکاڑہ کے لیے ہے؟
یہ اوکاڑہ، ساہیوال اور پاکپتن اضلاع کے لیے ہے، جن میں رینالہ خورد، دیپالپور، چیچہ وطنی، عارف والا اور قریبی قصبے شامل ہیں۔

### کیا اشتہار لگانے کے لیے اکاؤنٹ چاہیے؟
نہیں۔ صرف فون نمبر چاہیے۔ اشتہار لگانے کے بعد ریفرنس نمبر ملتا ہے جس سے آپ اشتہار سنبھال سکتے ہیں۔

### اشتہار کی قیمت کتنی ہے؟
اشتہار 7 دن کے لیے 150 روپے سے شروع ہیں۔ کاریگر ایک بار 1,000 روپے اور کاروبار ایک بار 2,000 روپے دیتے ہیں۔ قیمتوں کا صفحہ دیکھیں۔ آفر کے دنوں میں اشتہار مفت بھی ہوتے ہیں۔

### منظوری میں کتنا وقت لگتا ہے؟
عام طور پر اسی دن۔ ریفرنس نمبر اور فون سے میرے اشتہار میں اسٹیٹس دیکھیں۔

### میرا اشتہار کیوں مسترد ہوا؟
وجہ میرے اشتہار میں لکھی ہوتی ہے۔ عام وجوہات: تصاویر صاف نہیں، غلط کیٹیگری، یا ممنوعہ چیز۔ ٹھیک کر کے دوبارہ لگائیں۔

### بیچنے کے بعد اشتہار کیسے ہٹاؤں؟
میرے اشتہار کھولیں، ریفرنس نمبر اور فون لکھیں، اور بک گیا دبائیں۔

### ادائیگی کیسے کروں؟
جاز کیش، ایزی پیسہ یا بینک ٹرانسفر سے۔ اشتہار لگاتے وقت ٹرانزیکشن آئی ڈی اور اسکرین شاٹ لگائیں۔

### کیا رشتہ نجی ہے؟
جی ہاں۔ نام اور نمبر کبھی نہیں دکھائے جاتے، تصاویر دھندلی رہتی ہیں، اور نمبر صرف دونوں خاندانوں کی ہاں کے بعد ملتا ہے۔`,
    },
  },
  pricing: {
    title: { en: 'Pricing', ur: 'قیمتیں' },
    body: {
      en: 'Simple prices in rupees. Pay by JazzCash, Easypaisa or bank transfer. Prices may change during offers; the price shown when you post is the price you pay.',
      ur: 'روپوں میں آسان قیمتیں۔ جاز کیش، ایزی پیسہ یا بینک ٹرانسفر سے ادائیگی کریں۔ آفر کے دنوں میں قیمتیں بدل سکتی ہیں؛ اشتہار لگاتے وقت جو قیمت دکھائی دے وہی دینی ہوگی۔',
    },
  },
  safety: {
    title: { en: 'Safety tips', ur: 'حفاظتی ہدایات' },
    body: {
      en: `## For buyers
- Meet the seller in a busy public place, in daylight.
- See and test the item before you pay.
- **Never send money in advance** for an item you have not seen.
- For vehicles and property, check the documents (registration, ownership) carefully.
- Be careful of prices that are too low to be true.

## For sellers
- Do not share bank PINs, OTP codes or passwords with anyone.
- Take cash or confirm the payment in your account before handing over the item.
- Do not accept fake "payment sent" screenshots without checking your account.

## For everyone
- Apna Okara will never ask for your password or OTP code.
- Report any ad that looks like fraud. Our team checks every report.`,
      ur: `## خریداروں کے لیے
- بیچنے والے سے دن کے وقت مصروف عوامی جگہ پر ملیں۔
- ادائیگی سے پہلے چیز دیکھیں اور چیک کریں۔
- جو چیز نہیں دیکھی اس کے لیے **کبھی پیشگی رقم نہ بھیجیں**۔
- گاڑی اور پراپرٹی کے کاغذات (رجسٹریشن، ملکیت) اچھی طرح چیک کریں۔
- بہت کم قیمت والی چیزوں سے ہوشیار رہیں۔

## بیچنے والوں کے لیے
- بینک پن، او ٹی پی کوڈ یا پاس ورڈ کسی کو نہ بتائیں۔
- چیز دینے سے پہلے نقد رقم لیں یا اپنے اکاؤنٹ میں ادائیگی کی تصدیق کریں۔
- اکاؤنٹ چیک کیے بغیر "رقم بھیج دی" کے جعلی اسکرین شاٹ پر یقین نہ کریں۔

## سب کے لیے
- اپنا اوکاڑہ کبھی آپ کا پاس ورڈ یا او ٹی پی کوڈ نہیں مانگے گا۔
- جو اشتہار دھوکہ لگے اس کی شکایت کریں۔ ہماری ٹیم ہر شکایت چیک کرتی ہے۔`,
    },
  },
  community: {
    title: { en: 'Join our community', ur: 'ہماری کمیونٹی میں شامل ہوں' },
    body: {
      en: 'Join the Apna Okara WhatsApp community and Facebook page to get new ads, offers and local news from your city every day.',
      ur: 'اپنے شہر کے نئے اشتہار، آفرز اور مقامی خبریں روزانہ حاصل کرنے کے لیے اپنا اوکاڑہ کی واٹس ایپ کمیونٹی اور فیس بک پیج میں شامل ہوں۔',
    },
  },
  download: {
    title: { en: 'Get the Apna Okara app', ur: 'اپنا اوکاڑہ ایپ حاصل کریں' },
    body: {
      en: 'Post ads with your camera, get an alert when your ad goes live, and browse ads faster. The app is coming soon to Google Play and the App Store.',
      ur: 'کیمرے سے اشتہار لگائیں، اشتہار لائیو ہونے پر اطلاع پائیں اور تیزی سے اشتہار دیکھیں۔ ایپ جلد گوگل پلے اور ایپ اسٹور پر آ رہی ہے۔',
    },
  },
  terms: {
    title: { en: 'Terms and conditions', ur: 'شرائط و ضوابط' },
    body: {
      en: `These terms apply to everyone who uses Apna Okara (website and app). By using the site you agree to them.

## 1. What Apna Okara is
Apna Okara is a platform where people post ads and find each other. We are not the buyer or seller and we do not take part in deals between users.

## 2. Your ads
- You are responsible for what you post. It must be true and legal.
- We check ads before they go live and may reject, edit or remove any ad that breaks our Posting Rules.
- Ads run for the days you chose and then expire automatically.

## 3. Payments
- Fees are shown before you pay. Payments are checked by our team.
- See the Refund Policy for when money is returned.

## 4. Reviews and Rishta
- Reviews must be honest and about a real experience.
- Rishta information must be true; fake profiles are removed and the number is blocked.

## 5. Not allowed
Fraud, fake ads, illegal items, abusive language, misuse of other people's photos or numbers.

## 6. Our responsibility
We try our best to keep the platform safe, but we cannot guarantee any item, service or person. Always check yourself before you pay.

## 7. Changes
We may update these terms. The latest version is always on this page.`,
      ur: `یہ شرائط اپنا اوکاڑہ (ویب سائٹ اور ایپ) استعمال کرنے والے ہر شخص پر لاگو ہیں۔ سائٹ استعمال کر کے آپ ان سے متفق ہوتے ہیں۔

## 1. اپنا اوکاڑہ کیا ہے
اپنا اوکاڑہ ایک پلیٹ فارم ہے جہاں لوگ اشتہار لگاتے اور ایک دوسرے کو تلاش کرتے ہیں۔ ہم نہ خریدار ہیں نہ بیچنے والے، اور صارفین کے سودوں میں شامل نہیں ہوتے۔

## 2. آپ کے اشتہار
- جو آپ لگاتے ہیں اس کے آپ ذمہ دار ہیں۔ وہ سچ اور قانونی ہونا چاہیے۔
- ہم اشتہار لائیو ہونے سے پہلے چیک کرتے ہیں اور قواعد کے خلاف اشتہار مسترد، تبدیل یا ہٹا سکتے ہیں۔
- اشتہار آپ کے چنے ہوئے دنوں تک چلتا ہے، پھر خود ختم ہو جاتا ہے۔

## 3. ادائیگی
- فیس ادائیگی سے پہلے دکھائی جاتی ہے۔ ادائیگی ہماری ٹیم چیک کرتی ہے۔
- رقم واپسی کے لیے رقم واپسی کی پالیسی دیکھیں۔

## 4. تبصرے اور رشتہ
- تبصرے سچے اور حقیقی تجربے پر مبنی ہونے چاہئیں۔
- رشتہ کی معلومات درست ہونی چاہئیں؛ جعلی پروفائل ہٹا دی جاتی ہے اور نمبر بلاک ہوتا ہے۔

## 5. ممنوع
دھوکہ، جعلی اشتہار، غیر قانونی چیزیں، بدزبانی، دوسروں کی تصاویر یا نمبر کا غلط استعمال۔

## 6. ہماری ذمہ داری
ہم پلیٹ فارم کو محفوظ رکھنے کی پوری کوشش کرتے ہیں، لیکن کسی چیز، سروس یا شخص کی ضمانت نہیں دے سکتے۔ ادائیگی سے پہلے ہمیشہ خود تسلی کریں۔

## 7. تبدیلیاں
ہم یہ شرائط بدل سکتے ہیں۔ تازہ ترین ورژن ہمیشہ اسی صفحے پر ہوگا۔`,
    },
  },
  privacy: {
    title: { en: 'Privacy policy', ur: 'پرائیویسی پالیسی' },
    body: {
      en: `## What we collect
- For ads: your name, phone / WhatsApp number, city, ad details and photos.
- For payments: payment method, transaction ID and screenshot (seen only by our team).
- For Rishta: profile details, photos and a guardian contact. Names and numbers are never shown to other members.
- Basic technical data (like pages visited) to keep the site working and safe.

## How we use it
- To show your ad and let buyers contact you.
- To check payments and stop fraud.
- To verify Rishta profiles by phone.

## What we never do
- We never sell your data.
- We never show Rishta names, numbers or clear photos without permission.

## Your choices
- Mark your ad as sold or ask us to remove it at any time.
- Hide your number on an ad when posting.
- Contact us to correct or delete your information (records needed by law or for fraud checks may be kept).`,
      ur: `## ہم کیا جمع کرتے ہیں
- اشتہار کے لیے: آپ کا نام، فون / واٹس ایپ نمبر، شہر، اشتہار کی تفصیل اور تصاویر۔
- ادائیگی کے لیے: ادائیگی کا طریقہ، ٹرانزیکشن آئی ڈی اور اسکرین شاٹ (صرف ہماری ٹیم دیکھتی ہے)۔
- رشتہ کے لیے: پروفائل کی تفصیل، تصاویر اور سرپرست کا رابطہ۔ نام اور نمبر دوسرے ممبران کو کبھی نہیں دکھائے جاتے۔
- بنیادی تکنیکی معلومات (جیسے دیکھے گئے صفحات) تاکہ سائٹ چلتی رہے اور محفوظ رہے۔

## ہم اسے کیسے استعمال کرتے ہیں
- آپ کا اشتہار دکھانے اور خریداروں کو آپ سے رابطہ کرنے دینے کے لیے۔
- ادائیگی چیک کرنے اور دھوکہ روکنے کے لیے۔
- رشتہ پروفائلز کی فون پر تصدیق کے لیے۔

## ہم کبھی نہیں کرتے
- ہم آپ کا ڈیٹا کبھی نہیں بیچتے۔
- رشتہ کے نام، نمبر یا صاف تصاویر اجازت کے بغیر کبھی نہیں دکھاتے۔

## آپ کے اختیار
- کسی بھی وقت اشتہار کو بک گیا لگائیں یا ہٹانے کا کہیں۔
- اشتہار لگاتے وقت اپنا نمبر چھپائیں۔
- اپنی معلومات درست کرانے یا ہٹانے کے لیے رابطہ کریں (قانون یا دھوکہ کی جانچ کے لیے ضروری ریکارڈ رکھا جا سکتا ہے)۔`,
    },
  },
  'posting-rules': {
    title: { en: 'Posting rules', ur: 'اشتہار کے قواعد' },
    body: {
      en: `## Every ad must
- Be in the right category and city (Okara, Sahiwal or Pakpattan districts).
- Have a clear title, true details and real photos of the item.
- Show a fair price (or "contact for price").
- Be one ad per item. Do not post the same item many times.

## Not allowed
- Weapons, drugs, alcohol, stolen goods, fake documents or anything illegal
- Fake or copied photos, misleading prices or "bait" ads
- Adult content, abusive or political content
- Ads for items outside our areas
- Phone numbers or links inside photos

Ads that break these rules are rejected or removed. Repeated breaking of rules can block your number.`,
      ur: `## ہر اشتہار میں ضروری ہے
- درست کیٹیگری اور شہر ہو (اوکاڑہ، ساہیوال یا پاکپتن اضلاع)۔
- صاف عنوان، سچی تفصیل اور چیز کی اصل تصاویر ہوں۔
- مناسب قیمت ہو (یا "قیمت کے لیے رابطہ کریں")۔
- ایک چیز کا ایک اشتہار ہو۔ ایک ہی چیز بار بار نہ لگائیں۔

## ممنوع
- اسلحہ، منشیات، شراب، چوری کا مال، جعلی کاغذات یا کوئی غیر قانونی چیز
- جعلی یا کاپی کی ہوئی تصاویر، گمراہ کن قیمتیں
- فحش، بدزبانی یا سیاسی مواد
- ہمارے علاقوں سے باہر کی چیزوں کے اشتہار
- تصاویر کے اندر فون نمبر یا لنک

ان قواعد کے خلاف اشتہار مسترد یا ہٹا دیے جاتے ہیں۔ بار بار خلاف ورزی پر نمبر بلاک ہو سکتا ہے۔`,
    },
  },
  'refund-policy': {
    title: { en: 'Refund policy', ur: 'رقم واپسی کی پالیسی' },
    body: {
      en: `- **Ad rejected before going live:** you can ask for a refund, or fix the ad and post it again without paying again.
- **Payment not received / wrong amount:** contact us with the transaction ID; we will check and correct it.
- **Ad already live:** fees for the days the ad was live are not returned.
- **Ad removed for breaking the rules:** no refund.
- **Banners:** a banner that has not started can be refunded; once live, it is not refunded.

Refunds are sent to the same JazzCash / Easypaisa / bank account within 7 working days after approval.`,
      ur: `- **لائیو ہونے سے پہلے اشتہار مسترد ہوا:** آپ رقم واپسی کا کہہ سکتے ہیں، یا اشتہار ٹھیک کر کے بغیر دوبارہ ادائیگی کے لگا سکتے ہیں۔
- **ادائیگی نہیں ملی / غلط رقم:** ٹرانزیکشن آئی ڈی کے ساتھ رابطہ کریں؛ ہم چیک کر کے درست کریں گے۔
- **اشتہار لائیو ہو چکا:** جن دنوں اشتہار لائیو رہا ان کی فیس واپس نہیں ہوتی۔
- **قواعد کی خلاف ورزی پر اشتہار ہٹایا گیا:** رقم واپس نہیں ہوگی۔
- **بینر:** جو بینر شروع نہیں ہوا اس کی رقم واپس ہو سکتی ہے؛ لائیو ہونے کے بعد نہیں۔

منظوری کے بعد 7 کاروباری دنوں میں رقم اسی جاز کیش / ایزی پیسہ / بینک اکاؤنٹ میں بھیجی جاتی ہے۔`,
    },
  },
  disclaimer: {
    title: { en: 'Disclaimer', ur: 'دستبرداری' },
    body: {
      en: 'Apna Okara only connects buyers, sellers, service providers, businesses and families. We do not own, sell or guarantee any item or service, and we are not responsible for deals made between users. Prices and details in ads are provided by the people who post them. Please check everything yourself before paying or deciding.',
      ur: 'اپنا اوکاڑہ صرف خریداروں، بیچنے والوں، کاریگروں، کاروباروں اور خاندانوں کو آپس میں ملاتا ہے۔ ہم کسی چیز یا سروس کے مالک، بیچنے والے یا ضامن نہیں، اور صارفین کے آپس کے سودوں کے ذمہ دار نہیں۔ اشتہاروں کی قیمتیں اور تفصیل اشتہار لگانے والے دیتے ہیں۔ ادائیگی یا فیصلے سے پہلے خود ہر بات کی تسلی کریں۔',
    },
  },
};
