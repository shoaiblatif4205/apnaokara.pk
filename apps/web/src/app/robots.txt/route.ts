import { AI_BOTS, getSeo, SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

// robots.txt, built from Admin -> SEO. Private areas are always blocked.
// Rishta: only the landing page (/en/rishta, /ur/rishta) may be crawled.
// Test copies (Vercel preview, or SEO_BLOCK_ALL=1) block everything so they never get indexed.
export async function GET() {
  const headers = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600' };
  if (process.env.VERCEL_ENV === 'preview' || process.env.SEO_BLOCK_ALL === '1') {
    return new Response('# Apna Okara test copy: not for search engines\nUser-agent: *\nDisallow: /\n', { headers });
  }
  const seo = await getSeo();
  const extra = seo.blocked_paths
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\/\S*$/.test(l));

  const rules = [
    'Allow: /',
    'Allow: /en/rishta$',
    'Allow: /ur/rishta$',
    'Allow: /api/files/listing-images/',
    'Allow: /api/files/blog/',
    'Allow: /api/files/banners/',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /en/rishta/',
    'Disallow: /ur/rishta/',
    'Disallow: /en/my-ad',
    'Disallow: /ur/my-ad',
    'Disallow: /en/saved',
    'Disallow: /ur/saved',
    'Disallow: /en/banner-stats/',
    'Disallow: /ur/banner-stats/',
    'Disallow: /*?*sort=',
    ...extra.map((p) => `Disallow: ${p}`),
  ];

  const lines = ['# Apna Okara robots.txt (settings: Admin -> SEO)', '', 'User-agent: *', ...rules, ''];
  if (seo.ai_crawlers === 'block') {
    for (const bot of AI_BOTS) lines.push(`User-agent: ${bot}`, 'Disallow: /', '');
  } else {
    // AI search tools may read public pages (GEO); same private areas blocked.
    lines.push('# AI search and assistants', ...AI_BOTS.map((b) => `User-agent: ${b}`), ...rules, '');
  }
  lines.push(`Sitemap: ${SITE_URL}/sitemap.xml`, '');
  return new Response(lines.join('\n'), { headers });
}
