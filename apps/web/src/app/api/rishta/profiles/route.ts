import { NextResponse, type NextRequest } from 'next/server';
import { clientIp, rateLimited } from '@/lib/phone';
import { fail, noStore, requireAccount } from '@/lib/rishta/api';
import { createProfile, quoteRishta } from '@/lib/rishta/profiles';

export const dynamic = 'force-dynamic';

// POST multipart (data JSON + payment fields + screenshot) -> new profile
// POST JSON { quote: true, premium, promoCode }             -> price
export async function POST(req: NextRequest) {
  try {
    const account = await requireAccount();
    if (req.headers.get('content-type')?.includes('application/json')) {
      const b = (await req.json().catch(() => ({}))) as { premium?: boolean; promoCode?: string };
      return NextResponse.json(await quoteRishta({ premium: !!b.premium, promoCode: b.promoCode, phone: account.phone }), { headers: noStore });
    }
    if (rateLimited(`rprofile:${clientIp(req.headers)}`, 10, 60 * 60 * 1000)) return NextResponse.json({ message: 'Too many tries' }, { status: 429 });
    return NextResponse.json(await createProfile(account, await req.formData()), { status: 201, headers: noStore });
  } catch (e) {
    return fail(e);
  }
}
