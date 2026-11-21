import { NextResponse, type NextRequest } from 'next/server';
import { clientIp, rateLimited } from '@/lib/phone';
import { clearRishtaCookie, requestOtp, setRishtaCookie, verifyOtp } from '@/lib/rishta/session';
import { fail, noStore } from '@/lib/rishta/api';

export const dynamic = 'force-dynamic';

// POST { action: 'send', phone }            -> sends code (local: returns devCode)
// POST { action: 'verify', phone, code }    -> logs in (cookie + token for the app)
// POST { action: 'logout' }
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json().catch(() => ({}))) as Record<string, string>;
    if (b.action === 'send') {
      if (rateLimited(`otp:${clientIp(req.headers)}`, 10, 60 * 60 * 1000)) return NextResponse.json({ message: 'Too many tries. Try later.' }, { status: 429 });
      return NextResponse.json(await requestOtp(b.phone ?? ''), { headers: noStore });
    }
    if (b.action === 'verify') {
      if (rateLimited(`otpv:${clientIp(req.headers)}`, 20, 60 * 60 * 1000)) return NextResponse.json({ message: 'Too many tries. Try later.' }, { status: 429 });
      const { account, token } = await verifyOtp(b.phone ?? '', b.code ?? '');
      await setRishtaCookie(token);
      return NextResponse.json({ token, phone: account.phone }, { headers: noStore });
    }
    if (b.action === 'logout') {
      await clearRishtaCookie();
      return NextResponse.json({ ok: true }, { headers: noStore });
    }
    return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return fail(e);
  }
}
