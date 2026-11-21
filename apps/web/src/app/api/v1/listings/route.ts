import { NextResponse, type NextRequest } from 'next/server';
import { createListing, UserError } from '@/lib/listings';
import { clientIp, rateLimited } from '@/lib/phone';
import { searchAds } from '@/lib/public';

export const dynamic = 'force-dynamic';

// GET ?q=&category=&sub=&city=&min=&max=&sort=&page=  -> live ads (used by the app)
export async function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams;
  const num = (k: string) => {
    const n = Number.parseInt(s.get(k) ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const sort = s.get('sort');
  const result = await searchAds({
    q: s.get('q') ?? undefined,
    categorySlug: s.get('category') ?? undefined,
    subSlug: s.get('sub') ?? undefined,
    model: s.get('model') ?? undefined,
    citySlug: s.get('city') ?? undefined,
    priceMin: num('min'),
    priceMax: num('max'),
    featuredOnly: s.get('featured') === '1',
    sort: sort === 'price_asc' || sort === 'price_desc' ? sort : 'newest',
    page: num('page') ?? 1,
    perPage: 20,
  });
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}

// POST multipart/form-data: data (JSON), photos (files), screenshot (file, if paid)
export async function POST(req: NextRequest) {
  if (rateLimited(`post:${clientIp(req.headers)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited', message: 'Too many ads from this connection. Try again in an hour.' }, { status: 429 });
  }
  try {
    const form = await req.formData();
    const result = await createListing(form);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    console.error('createListing failed', e);
    return NextResponse.json({ error: 'server', message: 'Something went wrong' }, { status: 500 });
  }
}
