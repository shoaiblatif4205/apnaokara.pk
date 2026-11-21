// Social media kit: profile pictures, covers, post and story designs (main brand + Rishta).
// Run from project root:  npm run social   -> files in brand/social/
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'brand', 'social');
mkdirSync(out, { recursive: true });
const urduFont = join(root, 'node_modules/@expo-google-fonts/noto-nastaliq-urdu/NotoNastaliqUrdu_700Bold.ttf');
const urduRegular = join(root, 'node_modules/@expo-google-fonts/noto-nastaliq-urdu/NotoNastaliqUrdu_400Regular.ttf');

const GREEN = '#15803D';
const DARK = '#14532D';
const ORANGE = '#F97316';
const PINK = '#BE185D';
const PINK_DARK = '#831843';
const U = "font-family=\"Noto Nastaliq Urdu\"";
const E = "font-family=\"Arial, Helvetica, sans-serif\"";

const pin = (fill, inner) => `
  <path d="M24 3C15.2 3 8 10 8 18.8 8 30.5 24 45 24 45s16-14.5 16-26.2C40 10 32.8 3 24 3z" fill="${fill}"/>
  <circle cx="24" cy="19" r="9" fill="${inner}"/>
  <path d="M19 21.5h10l-1.2 4h-7.6z" fill="${ORANGE}"/>
  <path d="M20.5 21.5c0-3 1.6-5.5 3.5-5.5s3.5 2.5 3.5 5.5" fill="none" stroke="${ORANGE}" stroke-width="1.8"/>`;
const heart = (fill) => `<path d="M24 42s-16-9.6-16-21.3C8 14.4 12.6 10 18 10c3 0 4.8 1.4 6 3.2C25.2 11.4 27 10 30 10c5.4 0 10 4.4 10 10.7C40 32.4 24 42 24 42z" fill="${fill}"/>`;

function render(name, svg, width) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: [urduFont, urduRegular], loadSystemFonts: true, defaultFontFamily: 'Arial' },
  }).render().asPng();
  writeFileSync(join(out, name), png);
  console.log('wrote brand/social/' + name);
}

// ---------- Main brand ----------
// Profile picture (Facebook, Instagram, WhatsApp, YouTube). Safe inside a circle crop.
render('apna-okara-profile.png', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="${GREEN}"/>
  <g transform="translate(360 190) scale(7.5)">${pin('#FFFFFF', GREEN)}</g>
  <text x="540" y="800" text-anchor="middle" ${U} font-size="120" fill="#FFFFFF">اپنا اوکاڑہ</text>
</svg>`, 1080);

// Facebook cover (1640x624; the middle 1640x464 shows on phones, so text stays in the middle)
const fbCover = (ur) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1640 624">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GREEN}"/><stop offset="1" stop-color="${DARK}"/></linearGradient></defs>
  <rect width="1640" height="624" fill="url(#g)"/>
  <circle cx="1500" cy="80" r="220" fill="#FFFFFF" opacity="0.06"/><circle cx="120" cy="560" r="180" fill="#FFFFFF" opacity="0.06"/>
  ${ur
    ? `<text x="820" y="250" text-anchor="middle" ${U} font-size="96" fill="#FFFFFF">اوکاڑہ کا اپنا بازار</text>
       <text x="820" y="360" text-anchor="middle" ${U} font-size="44" fill="#DCFCE7">خریدیں · بیچیں · کاریگر · نوکریاں · پراپرٹی · رشتہ</text>
       <text x="820" y="455" text-anchor="middle" ${U} font-size="38" fill="#FFFFFF">اوکاڑہ · ساہیوال · پاکپتن</text>`
    : `<text x="820" y="240" text-anchor="middle" ${E} font-size="92" font-weight="700" fill="#FFFFFF">Apna Okara</text>
       <text x="820" y="320" text-anchor="middle" ${E} font-size="40" fill="#DCFCE7">Buy · Sell · Services · Jobs · Property · Rishta</text>
       <text x="820" y="390" text-anchor="middle" ${E} font-size="34" fill="#FFFFFF">Okara · Sahiwal · Pakpattan</text>`}
  <rect x="640" y="485" width="360" height="64" rx="32" fill="${ORANGE}"/>
  <text x="820" y="528" text-anchor="middle" ${E} font-size="32" font-weight="700" fill="#FFFFFF">apnaokara.pk</text>
</svg>`;
render('facebook-cover-urdu.png', fbCover(true), 1640);
render('facebook-cover-english.png', fbCover(false), 1640);

// YouTube banner (2560x1440; safe area is the middle 1546x423)
render('youtube-banner.png', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2560 1440">
  <rect width="2560" height="1440" fill="${GREEN}"/>
  <rect y="500" width="2560" height="440" fill="${DARK}" opacity="0.35"/>
  <g transform="translate(560 540) scale(7)">${pin('#FFFFFF', GREEN)}</g>
  <text x="1500" y="700" text-anchor="middle" ${U} font-size="150" fill="#FFFFFF">اپنا اوکاڑہ</text>
  <text x="1500" y="820" text-anchor="middle" ${E} font-size="64" fill="#DCFCE7">Okara · Sahiwal · Pakpattan · apnaokara.pk</text>
</svg>`, 2560);

// Square post (1080x1080): launch announcement
render('post-launch-urdu.png', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="${GREEN}"/>
  <rect x="60" y="60" width="960" height="960" rx="48" fill="#FFFFFF"/>
  <g transform="translate(468 110) scale(3)">${pin(GREEN, '#FFFFFF')}</g>
  <text x="540" y="380" text-anchor="middle" ${U} font-size="88" fill="${DARK}">اپنا اوکاڑہ آ گیا!</text>
  <text x="540" y="500" text-anchor="middle" ${U} font-size="48" fill="#374151">اوکاڑہ، ساہیوال اور پاکپتن کا اپنا آن لائن بازار</text>
  <text x="540" y="610" text-anchor="middle" ${U} font-size="44" fill="#374151">موبائل · بائیک · گاڑیاں · پراپرٹی · نوکریاں · کاریگر</text>
  <rect x="240" y="720" width="600" height="110" rx="55" fill="${ORANGE}"/>
  <text x="540" y="795" text-anchor="middle" ${U} font-size="54" fill="#FFFFFF">آج ہی اشتہار لگائیں</text>
  <text x="540" y="940" text-anchor="middle" ${E} font-size="48" font-weight="700" fill="${GREEN}">apnaokara.pk</text>
</svg>`, 1080);

// Story / WhatsApp status (1080x1920)
render('story-launch-urdu.png', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GREEN}"/><stop offset="1" stop-color="${DARK}"/></linearGradient></defs>
  <rect width="1080" height="1920" fill="url(#s)"/>
  <g transform="translate(390 260) scale(6.25)">${pin('#FFFFFF', GREEN)}</g>
  <text x="540" y="820" text-anchor="middle" ${U} font-size="120" fill="#FFFFFF">اپنا اوکاڑہ</text>
  <text x="540" y="980" text-anchor="middle" ${U} font-size="60" fill="#DCFCE7">اپنے شہر میں خریدیں اور بیچیں</text>
  <text x="540" y="1110" text-anchor="middle" ${U} font-size="50" fill="#FFFFFF">اوکاڑہ · ساہیوال · پاکپتن</text>
  <rect x="190" y="1300" width="700" height="130" rx="65" fill="${ORANGE}"/>
  <text x="540" y="1385" text-anchor="middle" ${U} font-size="60" fill="#FFFFFF">2 منٹ میں اشتہار لگائیں</text>
  <text x="540" y="1640" text-anchor="middle" ${E} font-size="64" font-weight="700" fill="#FFFFFF">apnaokara.pk</text>
</svg>`, 1080);

// ---------- Rishta ----------
render('rishta-profile.png', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="${PINK}"/>
  <g transform="translate(372 170) scale(7)">${heart('#FFFFFF')}</g>
  <text x="540" y="770" text-anchor="middle" ${U} font-size="110" fill="#FFFFFF">اپنا اوکاڑہ رشتہ</text>
</svg>`, 1080);

render('rishta-facebook-cover.png', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1640 624">
  <defs><linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PINK}"/><stop offset="1" stop-color="${PINK_DARK}"/></linearGradient></defs>
  <rect width="1640" height="624" fill="url(#r)"/>
  <text x="820" y="250" text-anchor="middle" ${U} font-size="96" fill="#FFFFFF">اپنا اوکاڑہ رشتہ</text>
  <text x="820" y="360" text-anchor="middle" ${U} font-size="46" fill="#FCE7F3">محفوظ · باعزت · خاندان کی رضامندی سے</text>
  <text x="820" y="455" text-anchor="middle" ${U} font-size="38" fill="#FFFFFF">نام اور نمبر کبھی عام نہیں · خاتون کوآرڈینیٹر</text>
  <rect x="610" y="490" width="420" height="64" rx="32" fill="#FFFFFF"/>
  <text x="820" y="533" text-anchor="middle" ${E} font-size="30" font-weight="700" fill="${PINK}">apnaokara.pk/rishta</text>
</svg>`, 1640);

render('rishta-post-urdu.png', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="${PINK}"/>
  <rect x="60" y="60" width="960" height="960" rx="48" fill="#FFFFFF"/>
  <g transform="translate(456 110) scale(3.5)">${heart(PINK)}</g>
  <text x="540" y="390" text-anchor="middle" ${U} font-size="84" fill="${PINK_DARK}">اپنا اوکاڑہ رشتہ</text>
  <text x="540" y="510" text-anchor="middle" ${U} font-size="46" fill="#374151">اوکاڑہ، ساہیوال اور پاکپتن کے خاندانوں کے لیے</text>
  <text x="540" y="620" text-anchor="middle" ${U} font-size="42" fill="#374151">نام اور نمبر نجی · تصاویر دھندلی · دونوں کی ہاں کے بعد رابطہ</text>
  <rect x="240" y="720" width="600" height="110" rx="55" fill="${PINK}"/>
  <text x="540" y="795" text-anchor="middle" ${U} font-size="52" fill="#FFFFFF">اپنی پروفائل بنائیں</text>
  <text x="540" y="940" text-anchor="middle" ${E} font-size="44" font-weight="700" fill="${PINK}">apnaokara.pk/rishta</text>
</svg>`, 1080);
