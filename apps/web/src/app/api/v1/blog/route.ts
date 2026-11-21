import { NextResponse, type NextRequest } from 'next/server';
import { getBlogCategories, listPosts } from '@/lib/blog';

export const dynamic = 'force-dynamic';

// Blog list for the app: /api/v1/blog?locale=ur&category=safety&page=2
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const locale = sp.get('locale') === 'en' ? 'en' : 'ur';
  const category = sp.get('category') || undefined;
  const page = Math.min(100, Math.max(1, Number(sp.get('page')) || 1));
  const [list, categories] = await Promise.all([listPosts({ locale, category, page, perPage: 12 }), getBlogCategories(locale)]);
  return NextResponse.json(
    { ...list, categories: categories.filter((c) => c.posts > 0) },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  );
}
