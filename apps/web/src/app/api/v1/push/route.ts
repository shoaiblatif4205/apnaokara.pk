import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { q, q1 } from '@/lib/db';
import { clientIp, normalizePhone, rateLimited } from '@/lib/phone';
import { getRishtaAccount } from '@/lib/rishta/session';

export const dynamic = 'force-dynamic';

// App push settings. One endpoint, several actions:
//  register  { token, platform, locale, notify_ads?, notify_follows?, notify_rishta? }
//  ads       { token, ads: [{ reference, phone }] }   -> notify about my ads (phone must match)
//  follow    { token, category, city? }               -> new ads in a category (+ city)
//  unfollow  { token, id }
//  rishta    { token }  (+ Rishta Bearer token)       -> rishta interests
//  state     { token }                                 -> current settings and follows

const TOKEN = z.string().regex(/^Expo(nent)?PushToken\[[\w-]{10,}\]$/);
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('register'),
    token: TOKEN,
    platform: z.enum(['android', 'ios']).default('android'),
    locale: z.enum(['en', 'ur']).default('ur'),
    notify_ads: z.boolean().optional(),
    notify_follows: z.boolean().optional(),
    notify_rishta: z.boolean().optional(),
  }),
  z.object({ action: z.literal('ads'), token: TOKEN, ads: z.array(z.object({ reference: z.string().max(20), phone: z.string().max(20) })).max(20) }),
  z.object({ action: z.literal('follow'), token: TOKEN, category: z.string().max(80), city: z.string().max(80).nullish() }),
  z.object({ action: z.literal('unfollow'), token: TOKEN, id: z.number().int() }),
  z.object({ action: z.literal('rishta'), token: TOKEN }),
  z.object({ action: z.literal('state'), token: TOKEN }),
]);

async function device(token: string) {
  return q1<{ id: number; locale: string; notify_ads: boolean; notify_follows: boolean; notify_rishta: boolean }>(
    'select id, locale, notify_ads, notify_follows, notify_rishta from push_devices where token = $1',
    [token],
  );
}

async function state(id: number) {
  const [d, follows] = await Promise.all([
    q1('select locale, notify_ads, notify_follows, notify_rishta from push_devices where id = $1', [id]),
    q<{ id: number; category: string; category_en: string; category_ur: string; city: string | null; city_en: string | null; city_ur: string | null }>(
      `select f.id, c.slug as category, c.name_en as category_en, c.name_ur as category_ur, ci.slug as city, ci.name_en as city_en, ci.name_ur as city_ur
         from push_follows f join categories c on c.id = f.category_id left join cities ci on ci.id = f.city_id
        where f.device_id = $1 order by f.created_at`,
      [id],
    ),
  ]);
  return { ...d, follows };
}

export async function POST(req: NextRequest) {
  if (rateLimited(`push:${clientIp(req.headers)}`, 120, 60 * 60 * 1000)) return NextResponse.json({ message: 'Too many requests' }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  const b = parsed.data;

  if (b.action === 'register') {
    const r = await q1<{ id: number }>(
      `insert into push_devices (token, platform, locale, notify_ads, notify_follows, notify_rishta)
       values ($1, $2, $3, coalesce($4, true), coalesce($5, true), coalesce($6, true))
       on conflict (token) do update set platform = excluded.platform, locale = excluded.locale, is_active = true, last_seen_at = now(),
         notify_ads = coalesce($4, push_devices.notify_ads), notify_follows = coalesce($5, push_devices.notify_follows),
         notify_rishta = coalesce($6, push_devices.notify_rishta)
       returning id`,
      [b.token, b.platform, b.locale, b.notify_ads ?? null, b.notify_follows ?? null, b.notify_rishta ?? null],
    );
    return NextResponse.json(await state(r!.id));
  }

  const d = await device(b.token);
  if (!d) return NextResponse.json({ message: 'Register first' }, { status: 404 });

  if (b.action === 'ads') {
    let linked = 0;
    for (const a of b.ads) {
      const phone = normalizePhone(a.phone);
      if (!phone) continue;
      const l = await q1<{ id: string }>('select id from listings where reference = $1 and seller_phone = $2', [a.reference.trim().toUpperCase(), phone]);
      if (!l) continue;
      await q('insert into push_device_listings (device_id, listing_id) values ($1, $2) on conflict do nothing', [d.id, l.id]);
      linked++;
    }
    return NextResponse.json({ linked });
  }

  if (b.action === 'follow') {
    const cat = await q1<{ id: number }>('select id from categories where slug = $1 and is_active', [b.category]);
    if (!cat) return NextResponse.json({ message: 'Unknown category' }, { status: 400 });
    const city = b.city ? await q1<{ id: number }>('select id from cities where slug = $1 and is_active', [b.city]) : null;
    const count = await q1<{ n: number }>('select count(*)::int as n from push_follows where device_id = $1', [d.id]);
    if ((count?.n ?? 0) >= 20) return NextResponse.json({ message: 'You can follow up to 20 searches' }, { status: 400 });
    await q(
      `insert into push_follows (device_id, category_id, city_id) values ($1, $2, $3)
       on conflict (device_id, category_id, city_id) do nothing`,
      [d.id, cat.id, city?.id ?? null],
    );
    return NextResponse.json(await state(d.id));
  }

  if (b.action === 'unfollow') {
    await q('delete from push_follows where id = $1 and device_id = $2', [b.id, d.id]);
    return NextResponse.json(await state(d.id));
  }

  if (b.action === 'rishta') {
    const acc = await getRishtaAccount();
    if (!acc) return NextResponse.json({ message: 'Login to Rishta first' }, { status: 401 });
    await q('insert into push_device_rishta (device_id, account_id) values ($1, $2) on conflict do nothing', [d.id, acc.id]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(await state(d.id));
}
