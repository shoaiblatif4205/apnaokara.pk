import { NextResponse, type NextRequest } from 'next/server';
import { UserError } from '@/lib/errors';
import { clientIp, rateLimited } from '@/lib/phone';
import { fail, noStore, requireMember } from '@/lib/rishta/api';
import {
  blockProfile,
  myInterests,
  reportProfile,
  requestMediation,
  respondInterest,
  sendInterest,
  sharePhotos,
  withdrawInterest,
} from '@/lib/rishta/profiles';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { profile } = await requireMember();
    return NextResponse.json({ interests: await myInterests(profile.id), me: profile.reference }, { headers: noStore });
  } catch (e) {
    return fail(e);
  }
}

// POST { action, reference?, interestId?, share?, note?, reason? }
export async function POST(req: NextRequest) {
  try {
    if (rateLimited(`rint:${clientIp(req.headers)}`, 120, 60 * 60 * 1000)) return NextResponse.json({ message: 'Too many actions. Slow down.' }, { status: 429 });
    const { profile } = await requireMember();
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = Number(b.interestId);
    const ref = String(b.reference ?? '');
    switch (b.action) {
      case 'send':
        await sendInterest(profile, ref);
        break;
      case 'accept':
        await respondInterest(profile.id, id, true, b.share !== false);
        break;
      case 'decline':
        await respondInterest(profile.id, id, false, false);
        break;
      case 'withdraw':
        await withdrawInterest(profile.id, id);
        break;
      case 'share':
        await sharePhotos(profile.id, id, b.share !== false);
        break;
      case 'mediate':
        await requestMediation(profile.id, id, String(b.note ?? ''));
        break;
      case 'block':
        await blockProfile(profile.id, ref);
        break;
      case 'unblock':
        await blockProfile(profile.id, ref, true);
        break;
      case 'report':
        await reportProfile(profile.id, ref, String(b.reason ?? ''));
        break;
      default:
        throw new UserError('bad_request', 'Unknown action');
    }
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return fail(e);
  }
}
