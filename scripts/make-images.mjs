// Renders the brand SVGs into the PNG files the app stores and website need.
// Run from project root:  npm run images
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '#15803D';
const ORANGE = '#F97316';

// Pin mark (48x48 design grid)
const pin = (fill, inner) => `
  <path d="M24 3C15.2 3 8 10 8 18.8 8 30.5 24 45 24 45s16-14.5 16-26.2C40 10 32.8 3 24 3z" fill="${fill}"/>
  <circle cx="24" cy="19" r="9" fill="${inner}"/>
  <path d="M19 21.5h10l-1.2 4h-7.6z" fill="${ORANGE}"/>
  <path d="M20.5 21.5c0-3 1.6-5.5 3.5-5.5s3.5 2.5 3.5 5.5" fill="none" stroke="${ORANGE}" stroke-width="1.8"/>`;

function render(svg, width, out) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true } }).render().asPng();
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png);
  console.log('wrote', out.replace(root, '.'));
}

// App icon: white pin on green, full square (stores add their own rounding)
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${GREEN}"/>
  <g transform="translate(212 150) scale(12.5)">${pin('#FFFFFF', GREEN)}</g></svg>`;

// Android adaptive icon foreground: transparent, pin inside the 66% safe zone
const adaptive = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <g transform="translate(332 272) scale(7.5)">${pin('#FFFFFF', GREEN)}</g></svg>`;

// Splash: pin + name on green
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1242 2436">
  <rect width="1242" height="2436" fill="${GREEN}"/>
  <g transform="translate(471 900) scale(6.25)">${pin('#FFFFFF', GREEN)}</g>
  <text x="621" y="1330" text-anchor="middle" font-family="Arial, sans-serif" font-size="96" font-weight="700" fill="#FFFFFF">Apna Okara</text></svg>`;

// Website / social share image (1200x630)
const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${GREEN}"/>
  <g transform="translate(90 165) scale(6.25)">${pin('#FFFFFF', GREEN)}</g>
  <text x="430" y="290" font-family="Arial, sans-serif" font-size="84" font-weight="700" fill="#FFFFFF">Apna Okara</text>
  <text x="432" y="360" font-family="Arial, sans-serif" font-size="34" fill="#DCFCE7">Buy, sell, hire and find businesses</text>
  <text x="432" y="410" font-family="Arial, sans-serif" font-size="34" fill="#DCFCE7">in Okara, Sahiwal and Pakpattan</text>
  <text x="432" y="500" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="${ORANGE}">apnaokara.pk</text></svg>`;

// Facebook cover (1640x624)
const cover = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1640 624">
  <rect width="1640" height="624" fill="${GREEN}"/>
  <g transform="translate(560 150) scale(5.5)">${pin('#FFFFFF', GREEN)}</g>
  <text x="860" y="300" font-family="Arial, sans-serif" font-size="80" font-weight="700" fill="#FFFFFF">Apna Okara</text>
  <text x="862" y="370" font-family="Arial, sans-serif" font-size="32" fill="#DCFCE7">Okara · Sahiwal · Pakpattan</text>
  <text x="862" y="430" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="${ORANGE}">apnaokara.pk</text></svg>`;

render(icon, 1024, join(root, 'apps/mobile/assets/icon.png'));
render(adaptive, 1024, join(root, 'apps/mobile/assets/adaptive-icon.png'));
render(splash, 1242, join(root, 'apps/mobile/assets/splash.png'));
render(icon, 512, join(root, 'apps/web/public/icon-512.png'));
render(icon, 192, join(root, 'apps/web/public/icon-192.png'));
render(icon, 180, join(root, 'apps/web/public/apple-touch-icon.png'));
render(og, 1200, join(root, 'apps/web/public/og-image.png'));
render(icon, 1024, join(root, 'brand/app-icon.png'));
render(og, 1200, join(root, 'brand/og-image.png'));
render(cover, 1640, join(root, 'brand/facebook-cover.png'));

// Android notification icon: white shape on transparent (Android uses only the alpha)
const notif = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <g transform="translate(6 3) scale(1.75)">
    <path fill-rule="evenodd" fill="#FFFFFF" d="M24 3C15.2 3 8 10 8 18.8 8 30.5 24 45 24 45s16-14.5 16-26.2C40 10 32.8 3 24 3z M24 10a9 9 0 1 0 0.01 0z"/>
  </g></svg>`;
render(notif, 96, join(root, 'apps/mobile/assets/notification-icon.png'));
