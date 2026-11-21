import { NextResponse, type NextRequest } from 'next/server';
import { createBannerBooking, quoteBanner } from '@/lib/banners';
import { UserError } from '@/lib/errors';
import { clientIp, normalizePhone, rateLimited } from '@/lib/phone';

export const dynamic = 'force-dynamic';

// POST multipart: data (JSON), imageDesktop, imageMobile, screenshot  -> booking
// POST JSON { quote: true, placement, days, design, promoCode, phone } -> price
export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      return NextResponse.json(
        await quoteBanner({
          placement: String(b.placement),
          days: Number(b.days),
          design: !!b.design,
          promoCode: String(b.promoCode ?? ''),
          phone: typeof b.phone === 'string' ? normalizePhone(b.phone) : null,
        }),
      );
    }
    if (rateLimited(`banner:${clientIp(req.headers)}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'rate_limited', message: 'Too many bookings. Try again later.' }, { status: 429 });
    }
    return NextResponse.json(await createBannerBooking(await req.formData()), { status: 201 });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    console.error('banner booking failed', e);
    return NextResponse.json({ error: 'server', message: 'Something went wrong' }, { status: 500 });
  }
}
