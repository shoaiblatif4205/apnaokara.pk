import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const dev = process.env.NODE_ENV !== 'production';

// Browser security headers for every page and file.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://www.googletagmanager.com https://*.google-analytics.com",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com${dev ? ' ws: http://localhost:*' : ''}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  // Server actions may redirect to WhatsApp (admin reminders)
  "form-action 'self' https://wa.me https://api.whatsapp.com",
  ...(dev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(dev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Admin, Rishta and private APIs are never cached by browsers or shared caches
      { source: '/admin/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/rishta/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    ];
  },
  // The shared package is TypeScript source; Next compiles it.
  transpilePackages: ['@apna-okara/shared'],
  // Node-only database / password packages stay outside the bundle
  serverExternalPackages: ['pg', 'bcryptjs', 'sharp', 'tesseract.js', 'tesseract.js-core'],
  // Payment screenshot reading (OCR) starts a worker file and loads WASM + language data by path,
  // which the file tracer cannot see, so ship them with every route that takes a payment.
  outputFileTracingIncludes: Object.fromEntries(
    ['/api/v1/listings', '/api/v1/my-ads', '/api/v1/banners', '/api/rishta/profiles', '/api/rishta/profiles/[id]'].map((r) => [
      r,
      [
        '../../node_modules/tesseract.js/**/*',
        '../../node_modules/tesseract.js-core/*.{js,wasm,json}',
        '../../node_modules/@tesseract.js-data/eng/4.0.0_best_int/**/*',
        '../../node_modules/@tesseract.js-data/eng/package.json',
        '../../node_modules/{bmp-js,idb-keyval,is-electron,is-url,node-fetch,regenerator-runtime,wasm-feature-detect,zlibjs,whatwg-url,tr46,webidl-conversions}/**/*',
      ],
    ]),
  ),
  experimental: {
    // Admin forms upload banner images (compressed on the server)
    serverActions: { bodySizeLimit: '12mb' },
  },
  images: {
    // Photos are already resized + converted to WebP on upload; the built-in optimizer stays off (smaller attack surface)
    unoptimized: true,
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
};

export default withNextIntl(nextConfig);
