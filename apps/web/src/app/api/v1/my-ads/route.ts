import { NextResponse, type NextRequest } from 'next/server';
import { getMyAd, myAdAction, UserError } from '@/lib/listings';
import { clientIp, rateLimited } from '@/lib/phone';

export const dynamic = 'force-dynamic';

// POST form-data:
//   reference + phone              -> returns the ad
//   reference + phone + action     -> sold | edit (message) | renew (durationDays, payment fields, screenshot)
//   key (secret manage code)       -> needed for sold and reply
export async function POST(req: NextRequest) {
  if (rateLimited(`myad:${clientIp(req.headers)}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited', message: 'Too many tries. Wait a few minutes.' }, { status: 429 });
  }
  try {
    const form = await req.formData();
    const reference = String(form.get('reference') ?? '');
    const phone = String(form.get('phone') ?? '');
    if (form.get('action')) await myAdAction(form);
    const ad = await getMyAd(reference, phone, String(form.get('key') ?? '') || null);
    if (!ad) return NextResponse.json({ error: 'not_found', message: 'Ad not found' }, { status: 404 });
    return NextResponse.json({ ad });
  } catch (e) {
    if (e instanceof UserError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.code === 'not_found' ? 404 : 400 });
    }
    console.error('my-ads failed', e);
    return NextResponse.json({ error: 'server', message: 'Something went wrong' }, { status: 500 });
  }
}
