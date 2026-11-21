import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { q } from '@/lib/db';
import { clientIp, normalizePhone, rateLimited } from '@/lib/phone';

export const dynamic = 'force-dynamic';

// Contact Us form (website and app). Messages show in Admin -> Messages.
const schema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional().default(''),
  email: z.string().trim().max(120).optional().default(''),
  subject: z.enum(['general', 'ad', 'payment', 'advertise', 'rishta', 'report']).default('general'),
  message: z.string().trim().min(10).max(2000),
  locale: z.enum(['en', 'ur']).default('en'),
  website: z.string().optional(), // honeypot: real people leave it empty
});

export async function POST(req: NextRequest) {
  if (rateLimited(`contact:${clientIp(req.headers)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ message: 'too_many' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const short = parsed.error.issues.some((i) => i.path[0] === 'message');
    return NextResponse.json({ message: short ? 'too_short' : 'invalid' }, { status: 400 });
  }
  const d = parsed.data;
  if (d.website) return NextResponse.json({ ok: true }); // bot
  const phone = d.phone ? normalizePhone(d.phone) : null;
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) ? d.email.toLowerCase() : null;
  if (!phone && !email) return NextResponse.json({ message: 'need_contact' }, { status: 400 });
  await q(
    'insert into contact_messages (name, phone, email, subject, message, locale) values ($1, $2, $3, $4, $5, $6)',
    [d.name, phone, email, d.subject, d.message, d.locale],
  );
  return NextResponse.json({ ok: true });
}
