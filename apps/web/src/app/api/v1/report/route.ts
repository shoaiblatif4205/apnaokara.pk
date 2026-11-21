import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { reportAd } from '@/lib/public';
import { clientIp, normalizePhone, rateLimited } from '@/lib/phone';

export const dynamic = 'force-dynamic';

const schema = z.object({
  reference: z.string().regex(/^AO-\d{4,10}$/i),
  reason: z.enum(['fraud', 'wrong_category', 'sold', 'offensive', 'duplicate', 'other']),
  details: z.string().max(500).optional().default(''),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (rateLimited(`report:${clientIp(req.headers)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ message: 'Too many reports. Try later.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'Choose a reason' }, { status: 400 });
  const { reference, reason, details, phone } = parsed.data;
  const ok = await reportAd(reference, reason, details.trim(), phone ? normalizePhone(phone) : null);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ message: 'Ad not found' }, { status: 404 });
}
