import { NextResponse, type NextRequest } from 'next/server';
import { q1 } from '@/lib/db';
import { UserError } from '@/lib/errors';
import { clientIp, rateLimited } from '@/lib/phone';
import { addReview, getReviews } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

// GET ?reference=AO-10001 -> visible reviews (app)
export async function GET(req: NextRequest) {
  const ref = (req.nextUrl.searchParams.get('reference') ?? '').toUpperCase();
  const ad = /^AO-\d{4,10}$/.test(ref) ? await q1<{ id: string }>('select id from listings where reference = $1', [ref]) : null;
  if (!ad) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json(await getReviews(ad.id), { headers: { 'Cache-Control': 'no-store' } });
}

// POST { reference, name, phone, rating, comment }
export async function POST(req: NextRequest) {
  if (rateLimited(`review:${clientIp(req.headers)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited', message: 'Too many reviews from this connection. Try later.' }, { status: 429 });
  }
  try {
    await addReview(await req.json().catch(() => null));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.code === 'not_found' ? 404 : 400 });
    console.error('addReview failed', e);
    return NextResponse.json({ error: 'server', message: 'Something went wrong' }, { status: 500 });
  }
}
