import { blogSitemap, categoriesSitemap, listingsSitemap, pagesSitemap } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';

// /sitemaps/pages.xml, categories.xml, blog.xml, listings-1.xml, listings-2.xml ...
export async function GET(_req: Request, props: { params: Promise<{ file: string }> }) {
  const params = await props.params;
  const name = params.file.replace(/\.xml$/, '');
  let xml: string | null = null;
  if (name === 'pages') xml = await pagesSitemap();
  else if (name === 'categories') xml = await categoriesSitemap();
  else if (name === 'blog') xml = await blogSitemap();
  else {
    const m = name.match(/^listings-(\d{1,4})$/);
    if (m) xml = await listingsSitemap(Number(m[1]));
  }
  if (!xml) return new Response('Not found', { status: 404 });
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
}
