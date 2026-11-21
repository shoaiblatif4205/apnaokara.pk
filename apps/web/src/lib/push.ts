import { q, q1 } from '@/lib/db';
import { getSetting } from '@/lib/settings';

// App push notifications through Expo. Every message is first written to the
// push_messages outbox (with a dedupe key so nothing is sent twice), then sent.
// Sending happens only when PUSH_SEND=1 (live site); otherwise messages are
// marked "dry_run" so everything can be tested locally without real phones.

type Locale = 'en' | 'ur';
type Msg = { kind: string; title: Record<Locale, string>; body: Record<Locale, string>; data?: Record<string, string>; dedupe?: (deviceId: number) => string };

async function queue(devices: { id: number; locale: Locale }[], m: Msg): Promise<number> {
  let n = 0;
  for (const d of devices) {
    const r = await q(
      `insert into push_messages (device_id, kind, title, body, data, dedupe_key) values ($1, $2, $3, $4, $5, $6)
       on conflict (dedupe_key) do nothing returning id`,
      [d.id, m.kind, m.title[d.locale], m.body[d.locale], JSON.stringify(m.data ?? {}), m.dedupe ? m.dedupe(d.id) : null],
    );
    n += r.length;
  }
  if (n) void sendQueued().catch((e) => console.error('[push] send failed', e));
  return n;
}

type AdRow = { id: string; reference: string; slug: string; title: string; reject_reason: string | null; category_id: number; city_id: number; cat_en: string; cat_ur: string; city_en: string; city_ur: string };
async function ad(listingId: string) {
  return q1<AdRow>(
    `select l.id, l.reference, l.slug, l.title, l.reject_reason, l.category_id, l.city_id, c.name_en as cat_en, c.name_ur as cat_ur, ci.name_en as city_en, ci.name_ur as city_ur
       from listings l join categories c on c.id = l.category_id join cities ci on ci.id = l.city_id where l.id = $1`,
    [listingId],
  );
}
const short = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Ad approved / rejected / expiring: tell the phones that posted it. */
export async function notifyListing(listingId: string, kind: 'ad_approved' | 'ad_rejected' | 'ad_expiring'): Promise<number> {
  const a = await ad(listingId);
  if (!a) return 0;
  const devices = await q<{ id: number; locale: Locale }>(
    `select d.id, d.locale from push_devices d join push_device_listings x on x.device_id = d.id
      where x.listing_id = $1 and d.is_active and d.notify_ads`,
    [listingId],
  );
  if (!devices.length) return 0;
  const t = short(a.title);
  const texts: Record<typeof kind, Pick<Msg, 'title' | 'body'>> = {
    ad_approved: {
      title: { en: 'Your ad is live!', ur: 'آپ کا اشتہار لائیو ہو گیا!' },
      body: { en: `${t} (${a.reference}) is now live. Share it to sell faster.`, ur: `${t} (${a.reference}) اب لائیو ہے۔ جلدی بیچنے کے لیے شیئر کریں۔` },
    },
    ad_rejected: {
      title: { en: 'Your ad needs a change', ur: 'آپ کے اشتہار میں تبدیلی درکار ہے' },
      body: {
        en: `${t} (${a.reference}) was not approved${a.reject_reason ? `: ${short(a.reject_reason, 80)}` : '.'}`,
        ur: `${t} (${a.reference}) منظور نہیں ہوا${a.reject_reason ? `: ${short(a.reject_reason, 80)}` : '۔'}`,
      },
    },
    ad_expiring: {
      title: { en: 'Your ad ends soon', ur: 'آپ کا اشتہار جلد ختم ہو رہا ہے' },
      body: { en: `${t} (${a.reference}) ends soon. Renew it in My Ads to keep it live.`, ur: `${t} (${a.reference}) جلد ختم ہوگا۔ لائیو رکھنے کے لیے میرے اشتہار میں دوبارہ لگائیں۔` },
    },
  };
  return queue(devices, {
    kind,
    ...texts[kind],
    data: { url: kind === 'ad_approved' ? `/ad/${a.reference}` : `/my-ads?ref=${a.reference}` },
    dedupe: (d) => `${kind}:${listingId}:${d}${kind === 'ad_expiring' ? '' : `:${new Date().toISOString().slice(0, 13)}`}`,
  });
}

/** New approved ad: tell phones that follow its category (and city), at most once per few hours each. */
export async function notifyFollowers(listingId: string): Promise<number> {
  const a = await ad(listingId);
  if (!a) return 0;
  const gap = (await getSetting<{ follow_gap_hours?: number }>('public.push'))?.follow_gap_hours ?? 6;
  const rows = await q<{ id: number; locale: Locale; follow_id: number }>(
    `select d.id, d.locale, f.id as follow_id from push_follows f join push_devices d on d.id = f.device_id
      where f.category_id = $1 and (f.city_id is null or f.city_id = $2) and d.is_active and d.notify_follows
        and (f.last_notified_at is null or f.last_notified_at < now() - make_interval(hours => $3::int))
        and not exists (select 1 from push_device_listings x where x.device_id = d.id and x.listing_id = $4)`,
    [a.category_id, a.city_id, gap, listingId],
  );
  if (!rows.length) return 0;
  await q('update push_follows set last_notified_at = now() where id = any($1)', [rows.map((r) => r.follow_id)]);
  return queue(rows, {
    kind: 'follow_new',
    title: { en: `New in ${a.cat_en}, ${a.city_en}`, ur: `${a.city_ur} میں ${a.cat_ur} کا نیا اشتہار` },
    body: { en: short(a.title, 90), ur: short(a.title, 90) },
    data: { url: `/ad/${a.reference}` },
    dedupe: (d) => `follow:${listingId}:${d}`,
  });
}

/** Rishta: new interest or interest accepted. No names or details in the message (privacy). */
export async function notifyRishta(accountId: string, kind: 'rishta_interest' | 'rishta_accepted', ref: string): Promise<number> {
  const devices = await q<{ id: number; locale: Locale }>(
    `select d.id, d.locale from push_devices d join push_device_rishta r on r.device_id = d.id
      where r.account_id = $1 and d.is_active and d.notify_rishta`,
    [accountId],
  );
  return queue(devices, {
    kind,
    title: kind === 'rishta_interest' ? { en: 'New rishta interest', ur: 'رشتہ میں نئی دلچسپی' } : { en: 'Interest accepted', ur: 'دلچسپی قبول ہو گئی' },
    body:
      kind === 'rishta_interest'
        ? { en: `A family is interested in profile ${ref}. Open Rishta to reply.`, ur: `ایک خاندان نے پروفائل ${ref} میں دلچسپی ظاہر کی ہے۔ جواب کے لیے رشتہ کھولیں۔` }
        : { en: `A family accepted your interest (${ref}). You can now see the contact.`, ur: `ایک خاندان نے آپ کی دلچسپی (${ref}) قبول کر لی۔ اب رابطہ دیکھ سکتے ہیں۔` },
    data: { url: '/rishta' },
    dedupe: (d) => `${kind}:${accountId}:${ref}:${d}:${new Date().toISOString().slice(0, 13)}`,
  });
}

/** Hourly: ads that end within N hours get one "ends soon" push. */
export async function queueExpiringReminders(): Promise<number> {
  const hours = (await getSetting<{ expiring_hours?: number }>('public.push'))?.expiring_hours ?? 48;
  const ads = await q<{ id: string }>(
    `select l.id from listings l
      where l.status = 'approved' and l.expires_at between now() and now() + make_interval(hours => $1::int)
        and exists (select 1 from push_device_listings x where x.listing_id = l.id)
        and not exists (select 1 from listing_reminders r where r.listing_id = l.id and r.channel = 'push' and r.kind = 'expiring')`,
    [hours],
  );
  let n = 0;
  for (const a of ads) {
    n += await notifyListing(a.id, 'ad_expiring');
    await q(`insert into listing_reminders (listing_id, channel, kind) values ($1, 'push', 'expiring')`, [a.id]);
  }
  return n;
}

let sending = false;
/** Send queued messages to Expo (100 at a time). */
export async function sendQueued(): Promise<{ sent: number; failed: number; dry: number }> {
  if (sending) return { sent: 0, failed: 0, dry: 0 };
  sending = true;
  const result = { sent: 0, failed: 0, dry: 0 };
  try {
    for (let round = 0; round < 10; round++) {
      const batch = await q<{ id: number; token: string; title: string; body: string; data: Record<string, string> }>(
        `select m.id, d.token, m.title, m.body, m.data from push_messages m join push_devices d on d.id = m.device_id
          where m.status = 'queued' order by m.created_at limit 100`,
      );
      if (!batch.length) break;
      if (process.env.PUSH_SEND !== '1') {
        await q(`update push_messages set status = 'dry_run', sent_at = now() where id = any($1)`, [batch.map((b) => b.id)]);
        result.dry += batch.length;
        continue;
      }
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(batch.map((b) => ({ to: b.token, title: b.title, body: b.body, data: b.data, sound: 'default', channelId: 'default' }))),
      });
      const json = (await res.json().catch(() => null)) as { data?: { status: string; id?: string; message?: string; details?: { error?: string } }[] } | null;
      if (!res.ok || !json?.data) {
        await q(`update push_messages set status = 'failed', error = $2 where id = any($1)`, [batch.map((b) => b.id), `HTTP ${res.status}`]);
        result.failed += batch.length;
        break;
      }
      for (let i = 0; i < batch.length; i++) {
        const t = json.data[i];
        if (t?.status === 'ok') {
          await q(`update push_messages set status = 'sent', sent_at = now(), ticket_id = $2 where id = $1`, [batch[i].id, t.id ?? null]);
          result.sent++;
        } else {
          await q(`update push_messages set status = 'failed', error = $2 where id = $1`, [batch[i].id, t?.message ?? 'unknown']);
          if (t?.details?.error === 'DeviceNotRegistered') await q('update push_devices set is_active = false where token = $1', [batch[i].token]);
          result.failed++;
        }
      }
    }
  } finally {
    sending = false;
  }
  return result;
}

/** Admin: send one message to all (or Urdu / English) app users. */
export async function broadcast(opts: { title: string; body: string; url?: string; locale?: Locale | 'all' }): Promise<number> {
  const devices = await q<{ id: number; locale: Locale }>(
    `select id, locale from push_devices where is_active ${opts.locale && opts.locale !== 'all' ? 'and locale = $1' : ''}`,
    opts.locale && opts.locale !== 'all' ? [opts.locale] : [],
  );
  const stamp = Date.now();
  return queue(devices, {
    kind: 'broadcast',
    title: { en: opts.title, ur: opts.title },
    body: { en: opts.body, ur: opts.body },
    data: opts.url ? { url: opts.url } : {},
    dedupe: (d) => `broadcast:${stamp}:${d}`,
  });
}
