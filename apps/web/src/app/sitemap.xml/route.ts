import { sitemapIndex } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(await sitemapIndex(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
