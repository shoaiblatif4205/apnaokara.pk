import { randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { ageFrom, RISHTA_OPTIONS, stripContacts } from '@apna-okara/shared';
import { q, q1, tx } from '@/lib/db';
import { UserError } from '@/lib/errors';
import { BadImageError, processPhoto } from '@/lib/images';
import { availableMethods, type PaymentAccounts } from '@/lib/meta';
import { normalizePhone } from '@/lib/phone';
import { checkPromo, recordPromoUse } from '@/lib/pricing';
import { getSetting } from '@/lib/settings';
import { notifyRishta } from '@/lib/push';
import { saveObject } from '@/lib/storage';
import { saveRishtaPhoto } from './photos';
import type { RishtaAccount } from './session';
import { assertNewPayment, screenshotKey } from '@/lib/paymentProof';

// Everything members can do in Rishta. Privacy rules are enforced here:
// name, phone and address are never returned to other members; photos are
// blurred unless the owner shared them; contact shows only after both say yes.

export type RishtaPlan = {
  days: number; price: number; premium_price: number | null; premium_days: number;
  interests_per_day: number; premium_interests_per_day: number; coordinator_fee: number | null;
};
export type RishtaFree = { enabled: boolean; days: number };

export const MAX_RISHTA_PHOTOS = 5;
const ACTIVE = `p.status = 'approved' and (p.expires_at is null or p.expires_at > now())`;
const vals = (k: keyof typeof RISHTA_OPTIONS) => RISHTA_OPTIONS[k].map((x) => x.value) as [string, ...string[]];

export async function getPlan(): Promise<{ plan: RishtaPlan; free: RishtaFree }> {
  const [plan, free] = await Promise.all([getSetting<RishtaPlan>('public.rishta_plan'), getSetting<RishtaFree>('public.rishta_free_mode')]);
  return {
    plan: { days: 90, price: 1000, premium_price: null, premium_days: 90, interests_per_day: 10, premium_interests_per_day: 30, coordinator_fee: null, ...(plan ?? {}) },
    free: { enabled: false, days: 90, ...(free ?? {}) },
  };
}

// ---------------- my profiles ----------------

export type MyProfile = {
  id: string; reference: string; gender: string; status: string; reject_reason: string | null; expires_at: string | null; created_by: string;
  date_of_birth: string; full_name: string | null; is_premium: boolean; photos: number; pending_payment: boolean;
};

export async function myProfiles(accountId: string): Promise<MyProfile[]> {
  return q<MyProfile>(
    `select p.id, p.reference, p.gender, p.status::text, p.reject_reason, p.expires_at, p.created_by, to_char(p.date_of_birth, 'YYYY-MM-DD') as date_of_birth,
            p.full_name, p.is_premium and (p.premium_until is null or p.premium_until > now()) as is_premium,
            (select count(*)::int from rishta_photos f where f.profile_id = p.id and not f.is_rejected) as photos,
            exists (select 1 from payments y where y.rishta_profile_id = p.id and y.status = 'pending') as pending_payment
       from rishta_profiles p where p.account_id = $1 order by p.created_at`,
    [accountId],
  );
}

/** The profile the member is acting as (cookie / X-Rishta-Profile header), else their first live one. */
export async function getActiveProfile(account: RishtaAccount): Promise<{ id: string; reference: string; gender: string; is_premium: boolean } | null> {
  const wanted = (await headers()).get('x-rishta-profile') ?? (await cookies()).get('ao_rishta_profile')?.value ?? null;
  const rows = await q<{ id: string; reference: string; gender: string; is_premium: boolean; status: string; expires_at: string | null }>(
    `select p.id, p.reference, p.gender, p.is_premium and (p.premium_until is null or p.premium_until > now()) as is_premium, p.status::text, p.expires_at
       from rishta_profiles p where p.account_id = $1 and ${ACTIVE} order by p.created_at`,
    [account.id],
  );
  const pick = rows.find((r) => r.id === wanted || r.reference === wanted) ?? rows[0];
  return pick ? { id: pick.id, reference: pick.reference, gender: pick.gender, is_premium: pick.is_premium } : null;
}

export async function setActiveProfileCookie(profileId: string) {
  (await cookies()).set('ao_rishta_profile', profileId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
}

// ---------------- create / edit ----------------

const profileSchema = z.object({
  createdBy: z.enum(vals('createdBy')),
  fullName: z.string().trim().min(2).max(80),
  gender: z.enum(['male', 'female']),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heightCm: z.number().int().min(120).max(220).nullable().optional(),
  complexion: z.enum(vals('complexion')).nullable().optional(),
  maritalStatus: z.enum(vals('maritalStatus')),
  children: z.number().int().min(0).max(15).default(0),
  religion: z.enum(vals('religion')).default('islam'),
  sect: z.enum(vals('sect')).nullable().optional(),
  caste: z.string().trim().max(60).optional().default(''),
  education: z.enum(vals('education')),
  profession: z.string().trim().max(80).optional().default(''),
  incomeRange: z.enum(vals('income')).nullable().optional(),
  nativeCityId: z.number().int().positive(),
  nativeLocalityId: z.number().int().positive().nullable().optional(),
  currentCity: z.string().trim().max(60).optional().default(''),
  currentCountry: z.string().trim().max(60).default('Pakistan'),
  houseType: z.enum(vals('houseType')).nullable().optional(),
  fatherProfession: z.string().trim().max(80).optional().default(''),
  motherProfession: z.string().trim().max(80).optional().default(''),
  brothers: z.number().int().min(0).max(20).nullable().optional(),
  sisters: z.number().int().min(0).max(20).nullable().optional(),
  marriedSiblings: z.number().int().min(0).max(40).nullable().optional(),
  familyType: z.enum(vals('familyType')).nullable().optional(),
  about: z.string().trim().max(1500).optional().default(''),
  lookingFor: z
    .object({
      ageMin: z.number().int().min(18).max(80).nullable().optional(),
      ageMax: z.number().int().min(18).max(80).nullable().optional(),
      education: z.string().max(40).nullable().optional(),
      maritalStatus: z.array(z.string()).max(3).optional(),
      caste: z.string().trim().max(60).optional(),
      city: z.string().trim().max(60).optional(),
      notes: z.string().trim().max(400).optional(),
    })
    .default({}),
  guardianName: z.string().trim().min(2).max(80),
  guardianPhone: z.string(),
  agree: z.literal(true),
});

function parseProfile(raw: unknown) {
  const p = profileSchema.safeParse(raw);
  if (!p.success) {
    const f = p.error.issues[0];
    throw new UserError('validation', `${f.path.join('.') || 'form'}: ${f.message}`);
  }
  const d = p.data;
  if (ageFrom(d.dateOfBirth) < 18) throw new UserError('age', 'The person must be 18 years or older.');
  if (ageFrom(d.dateOfBirth) > 80) throw new UserError('age', 'Check the date of birth.');
  const guardianPhone = normalizePhone(d.guardianPhone);
  if (!guardianPhone) throw new UserError('phone', 'Enter a valid guardian phone number');
  return { ...d, guardianPhone, about: stripContacts(d.about), lookingFor: { ...d.lookingFor, notes: d.lookingFor.notes ? stripContacts(d.lookingFor.notes) : undefined } };
}

const PROFILE_COLUMNS = `created_by, full_name, gender, date_of_birth, height_cm, complexion, marital_status, children, religion, sect, caste, education,
  profession, income_range, native_city_id, native_locality_id, current_city, current_country, house_type, father_profession, mother_profession,
  brothers, sisters, married_siblings, family_type, about, looking_for, guardian_name, guardian_phone`;

function profileValues(d: ReturnType<typeof parseProfile>) {
  return [
    d.createdBy, d.fullName, d.gender, d.dateOfBirth, d.heightCm ?? null, d.complexion ?? null, d.maritalStatus, d.children, d.religion, d.sect ?? null,
    d.caste || null, d.education, d.profession || null, d.incomeRange ?? null, d.nativeCityId, d.nativeLocalityId ?? null, d.currentCity || null,
    d.currentCountry || 'Pakistan', d.houseType ?? null, d.fatherProfession || null, d.motherProfession || null, d.brothers ?? null, d.sisters ?? null,
    d.marriedSiblings ?? null, d.familyType ?? null, d.about || null, JSON.stringify(d.lookingFor), d.guardianName, d.guardianPhone,
  ];
}

type Upload = { size: number; arrayBuffer(): Promise<ArrayBuffer> };
const asUpload = (v: unknown): Upload | null =>
  typeof v === 'object' && v !== null && 'arrayBuffer' in v && 'size' in v && (v as Upload).size > 0 ? (v as Upload) : null;

/** Quote for activating / renewing a profile. */
export async function quoteRishta(opts: { premium: boolean; promoCode?: string; phone: string | null }) {
  const { plan, free } = await getPlan();
  const items: { key: string; label: string; amount: number }[] = [];
  if (!free.enabled) items.push({ key: 'rishta_profile', label: `Rishta profile, ${plan.days} days`, amount: plan.price });
  if (opts.premium) {
    if (plan.premium_price == null) throw new UserError('premium', 'Premium is not available');
    items.push({ key: 'rishta_premium', label: `Premium, ${plan.premium_days} days`, amount: plan.premium_price });
  }
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  let discount = 0;
  let promoId: number | null = null;
  if (opts.promoCode?.trim() && subtotal > 0) {
    const pr = await checkPromo(opts.promoCode, 'rishta', subtotal, opts.phone);
    discount = pr.discount;
    promoId = pr.id;
  }
  return { free: free.enabled, days: free.enabled ? free.days : plan.days, items, subtotal, discount, total: subtotal - discount, promoId };
}

async function takePayment(form: FormData, total: number) {
  if (total <= 0) return { payment: null, shotKey: null };
  const payment = z
    .object({ method: z.enum(['jazzcash', 'easypaisa', 'nayapay', 'bank']), transactionId: z.string().trim().max(40).optional().default(""), paidFrom: z.string().trim().max(80).optional().default('') })
    .safeParse({ method: form.get('method'), transactionId: form.get('transactionId') ?? '', paidFrom: form.get('paidFrom') ?? '' });
  if (!payment.success) throw new UserError('payment', 'Add the payment details');
  const accounts = (await getSetting<PaymentAccounts>('public.payment_accounts')) ?? {};
  if (!availableMethods(accounts).includes(payment.data.method)) throw new UserError('payment', 'This payment method is not available');
  const shot = asUpload(form.get('screenshot'));
  if (!shot) throw new UserError('payment', 'Add the payment screenshot');
  if (shot.size > 10 * 1024 * 1024) throw new UserError('photo_size', 'Screenshot is too big (max 10 MB)');
  try {
    const buf = await processPhoto(Buffer.from(await shot.arrayBuffer()), 2000);
    await assertNewPayment(payment.data.method, payment.data.transactionId, buf, { fileTime: form.get('screenshotTime') });
    const key = screenshotKey('rishta', buf);
    await saveObject('payment-screenshots', key, buf, 'image/webp');
    return { payment: payment.data, shotKey: key };
  } catch (e) {
    if (e instanceof BadImageError) throw new UserError('photo_type', 'Screenshot must be a photo');
    throw e;
  }
}

export async function createProfile(account: RishtaAccount, form: FormData): Promise<{ id: string; reference: string }> {
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get('data') ?? '{}'));
  } catch {
    throw new UserError('bad_request', 'Invalid form data');
  }
  const d = parseProfile(raw);
  const count = await q1<{ n: number }>('select count(*)::int as n from rishta_profiles where account_id = $1', [account.id]);
  if ((count?.n ?? 0) >= 5) throw new UserError('limit', 'One account can have up to 5 profiles.');
  if (!(await q1('select 1 from cities where id = $1 and is_active', [d.nativeCityId]))) throw new UserError('city', 'Choose your native city');
  const extra = raw as { premium?: boolean; promoCode?: string };
  const quote = await quoteRishta({ premium: !!extra.premium, promoCode: extra.promoCode, phone: account.phone });
  const { payment, shotKey } = await takePayment(form, quote.total);

  return tx(async (c) => {
    const ins = await c.query<{ id: string; reference: string }>(
      `insert into rishta_profiles (account_id, ${PROFILE_COLUMNS}) values ($1, ${PROFILE_COLUMNS.split(',').map((_, i) => `$${i + 2}`).join(', ')})
       returning id, reference`,
      [account.id, ...profileValues(d)],
    );
    const { id, reference } = ins.rows[0];
    const pay = await c.query<{ id: string }>(
      `insert into payments (purpose, rishta_profile_id, amount, method, transaction_id, paid_from, screenshot_path, status, items, subtotal, discount, promo_code_id)
       values ('rishta', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
      [
        id, quote.total, payment?.method ?? 'free', payment?.transactionId || null, payment?.paidFrom || null, shotKey,
        quote.total > 0 ? 'pending' : quote.free && !quote.items.length ? 'free' : 'pending', JSON.stringify(quote.items), quote.subtotal, quote.discount, quote.promoId,
      ],
    );
    if (quote.promoId) await recordPromoUse(c, quote.promoId, pay.rows[0].id, account.phone);
    return { id, reference };
  });
}

export async function updateProfile(account: RishtaAccount, profileId: string, raw: unknown): Promise<void> {
  const d = parseProfile(raw);
  const own = await q1<{ status: string }>('select status::text from rishta_profiles where id = $1 and account_id = $2', [profileId, account.id]);
  if (!own) throw new UserError('not_found', 'Profile not found');
  if (own.status === 'removed' || own.status === 'hidden') throw new UserError('state', 'This profile cannot be edited. Contact us.');
  const sets = PROFILE_COLUMNS.split(',').map((c, i) => `${c.trim()} = $${i + 3}`).join(', ');
  await q(
    `update rishta_profiles set ${sets}, status = case when status = 'rejected' then 'pending'::rishta_status else status end, reject_reason = null
      where id = $1 and account_id = $2`,
    [profileId, account.id, ...profileValues(d)],
  );
}

/** Renew an expired profile or buy Premium. */
export async function payForProfile(account: RishtaAccount, profileId: string, form: FormData): Promise<void> {
  const own = await q1<{ status: string; expires_at: string | null }>('select status::text, expires_at from rishta_profiles where id = $1 and account_id = $2', [profileId, account.id]);
  if (!own) throw new UserError('not_found', 'Profile not found');
  if (await q1(`select 1 from payments where rishta_profile_id = $1 and status = 'pending'`, [profileId])) throw new UserError('state', 'A payment is already waiting for approval.');
  const renew = own.status === 'expired' || (own.status === 'approved' && own.expires_at !== null && new Date(own.expires_at) <= new Date());
  const premium = form.get('premium') === 'true';
  if (!renew && !premium) throw new UserError('state', 'Nothing to pay for');
  let quote = await quoteRishta({ premium, promoCode: String(form.get('promoCode') ?? ''), phone: account.phone });
  if (!renew) quote = { ...quote, items: quote.items.filter((i) => i.key !== 'rishta_profile') };
  quote.subtotal = quote.items.reduce((s, i) => s + i.amount, 0);
  quote.total = Math.max(0, quote.subtotal - quote.discount);
  const { payment, shotKey } = await takePayment(form, quote.total);
  await tx(async (c) => {
    const pay = await c.query<{ id: string }>(
      `insert into payments (purpose, rishta_profile_id, amount, method, transaction_id, paid_from, screenshot_path, status, items, subtotal, discount, promo_code_id)
       values ('rishta', $1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10) returning id`,
      [profileId, quote.total, payment?.method ?? 'free', payment?.transactionId || null, payment?.paidFrom || null, shotKey, JSON.stringify(quote.items), quote.subtotal, quote.discount, quote.promoId],
    );
    if (quote.promoId) await recordPromoUse(c, quote.promoId, pay.rows[0].id, account.phone);
    if (renew) await c.query(`update rishta_profiles set status = 'pending' where id = $1`, [profileId]);
  });
}

// ---------------- photos ----------------

export async function addPhoto(account: RishtaAccount, profileId: string, file: unknown): Promise<void> {
  const own = await q1<{ reference: string }>('select reference from rishta_profiles where id = $1 and account_id = $2', [profileId, account.id]);
  if (!own) throw new UserError('not_found', 'Profile not found');
  const n = await q1<{ n: number }>('select count(*)::int as n from rishta_photos where profile_id = $1 and not is_rejected', [profileId]);
  if ((n?.n ?? 0) >= MAX_RISHTA_PHOTOS) throw new UserError('limit', `Maximum ${MAX_RISHTA_PHOTOS} photos`);
  const up = asUpload(file);
  if (!up) throw new UserError('photo', 'Choose a photo');
  if (up.size > 10 * 1024 * 1024) throw new UserError('photo_size', 'Photo is too big (max 10 MB)');
  let paths;
  try {
    paths = await saveRishtaPhoto(Buffer.from(await up.arrayBuffer()), profileId, own.reference);
  } catch (e) {
    if (e instanceof BadImageError) throw new UserError('photo_type', 'Only photos can be uploaded');
    throw e;
  }
  await q(
    `insert into rishta_photos (profile_id, storage_path, watermarked_path, blurred_path, sort_order)
     values ($1, $2, $3, $4, (select coalesce(max(sort_order), -1) + 1 from rishta_photos where profile_id = $1))`,
    [profileId, paths.original, paths.watermarked, paths.blurred],
  );
}

export async function removePhoto(account: RishtaAccount, photoId: number): Promise<void> {
  const r = await q1(
    `update rishta_photos f set is_rejected = true from rishta_profiles p where f.id = $1 and f.profile_id = p.id and p.account_id = $2 returning f.id`,
    [photoId, account.id],
  );
  if (!r) throw new UserError('not_found', 'Photo not found');
}

export async function profilePhotos(profileId: string) {
  return q<{ id: number; is_approved: boolean }>('select id, is_approved from rishta_photos where profile_id = $1 and not is_rejected order by sort_order', [profileId]);
}

/** Can this viewer see the clear (watermarked) photos of that profile? */
export async function photoAccess(viewerProfileId: string, ownerProfileId: string): Promise<boolean> {
  const r = await q1(
    `select 1 from rishta_interests i where i.status = 'accepted' and (
        (i.from_profile_id = $1 and i.to_profile_id = $2 and i.photos_shared_by_receiver) or
        (i.to_profile_id = $1 and i.from_profile_id = $2 and i.photos_shared_by_sender))`,
    [viewerProfileId, ownerProfileId],
  );
  return !!r;
}

// ---------------- search & view ----------------

export type RishtaCard = {
  reference: string; gender: string; age: number; height_cm: number | null; marital_status: string; education: string; profession: string | null;
  caste: string | null; sect: string | null; city_en: string | null; city_ur: string | null; current_city: string | null; current_country: string;
  is_premium: boolean; photo_id: number | null; approved_at: string | null;
};

export type RishtaFilters = {
  gender?: string; ageMin?: number; ageMax?: number; city?: string; country?: string; education?: string; caste?: string; sect?: string;
  maritalStatus?: string; withPhoto?: boolean; sort?: 'new' | 'active'; page?: number;
};

const CARD = `
  select p.reference, p.gender, date_part('year', age(p.date_of_birth))::int as age, p.height_cm, p.marital_status, p.education, p.profession,
         p.caste, p.sect, c.name_en as city_en, c.name_ur as city_ur, p.current_city, p.current_country,
         p.is_premium and (p.premium_until is null or p.premium_until > now()) as is_premium, p.approved_at,
         (select f.id from rishta_photos f where f.profile_id = p.id and f.is_approved and not f.is_rejected order by f.sort_order limit 1) as photo_id
    from rishta_profiles p left join cities c on c.id = p.native_city_id`;

export async function searchProfiles(viewer: { id: string; gender: string; accountId: string }, f: RishtaFilters) {
  const params: unknown[] = [viewer.accountId, viewer.id];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const w = [
    ACTIVE,
    'p.account_id <> $1',
    `not exists (select 1 from rishta_blocks b where (b.blocker_profile_id = $2 and b.blocked_profile_id = p.id) or (b.blocker_profile_id = p.id and b.blocked_profile_id = $2))`,
  ];
  w.push(`p.gender = ${p(f.gender === 'male' || f.gender === 'female' ? f.gender : viewer.gender === 'male' ? 'female' : 'male')}`);
  if (f.ageMin) w.push(`p.date_of_birth <= (current_date - make_interval(years => ${p(f.ageMin)}::int))`);
  if (f.ageMax) w.push(`p.date_of_birth > (current_date - make_interval(years => ${p(f.ageMax + 1)}::int))`);
  if (f.city) w.push(`c.slug = ${p(f.city)}`);
  if (f.country) w.push(`p.current_country ilike ${p(f.country)}`);
  if (f.education) w.push(`p.education = ${p(f.education)}`);
  if (f.caste) w.push(`p.caste ilike ${p(`%${f.caste}%`)}`);
  if (f.sect) w.push(`p.sect = ${p(f.sect)}`);
  if (f.maritalStatus) w.push(`p.marital_status = ${p(f.maritalStatus)}`);
  if (f.withPhoto) w.push(`exists (select 1 from rishta_photos f where f.profile_id = p.id and f.is_approved and not f.is_rejected)`);
  const order = f.sort === 'active' ? 'p.last_active_at desc nulls last' : 'is_premium desc, p.approved_at desc';
  const page = Math.max(1, f.page ?? 1);
  const [{ n }] = await q<{ n: number }>(`select count(*)::int as n from rishta_profiles p left join cities c on c.id = p.native_city_id where ${w.join(' and ')}`, params);
  const rows = await q<RishtaCard>(`${CARD} where ${w.join(' and ')} order by ${order} limit 20 offset ${(page - 1) * 20}`, params);
  return { profiles: rows, total: n, page, pages: Math.ceil(n / 20) };
}

export type RishtaView = RishtaCard & {
  id: string; created_by: string; complexion: string | null; children: number; religion: string | null; income_range: string | null;
  house_type: string | null; father_profession: string | null; mother_profession: string | null; brothers: number | null; sisters: number | null;
  married_siblings: number | null; family_type: string | null; about: string | null; looking_for: Record<string, unknown>;
  photos: { id: number; clear: boolean }[];
  interest: { id: number; direction: 'sent' | 'received'; status: string; mediation: boolean; iShared: boolean; theyShared: boolean } | null;
  contact: { name: string; phone: string } | null;
  blocked: boolean;
};

export async function viewProfile(viewer: { id: string; accountId: string }, reference: string): Promise<RishtaView | null> {
  const row = await q1<RishtaView & { guardian_name: string; guardian_phone: string; account_id: string }>(
    `${CARD.replace('select p.reference', `select p.id, p.account_id, p.created_by, p.complexion, p.children, p.religion, p.income_range, p.house_type,
            p.father_profession, p.mother_profession, p.brothers, p.sisters, p.married_siblings, p.family_type, p.about, p.looking_for,
            p.guardian_name, p.guardian_phone, p.reference`)}
      where p.reference = $1 and ${ACTIVE}`,
    [reference.toUpperCase()],
  );
  if (!row) return null;
  const own = row.account_id === viewer.accountId;
  if (!own) {
    // Daily limit on different profiles opened (stops mass copying of profiles). Re-opening one does not count.
    const seen = await q1<{ n: number; again: boolean; premium: boolean }>(
      `select (select count(*)::int from rishta_profile_views where viewer_profile_id = $1 and day = (now() at time zone 'Asia/Karachi')::date) as n,
              exists (select 1 from rishta_profile_views where viewer_profile_id = $1 and viewed_profile_id = $2 and day = (now() at time zone 'Asia/Karachi')::date) as again,
              coalesce((select is_premium and (premium_until is null or premium_until > now()) from rishta_profiles where id = $1), false) as premium`,
      [viewer.id, row.id],
    );
    const limit = seen?.premium ? 150 : 60;
    if (!seen?.again && (seen?.n ?? 0) >= limit) throw new UserError('limit', `You can open up to ${limit} new profiles a day. Please come back tomorrow.`);
    if (!seen?.again) await q('insert into rishta_profile_views (viewer_profile_id, viewed_profile_id) values ($1, $2) on conflict do nothing', [viewer.id, row.id]);
  }
  const blocked = !!(await q1(
    'select 1 from rishta_blocks where (blocker_profile_id = $1 and blocked_profile_id = $2) or (blocker_profile_id = $2 and blocked_profile_id = $1)',
    [viewer.id, row.id],
  ));
  if (blocked && !own) {
    const mine = await q1('select 1 from rishta_blocks where blocker_profile_id = $1 and blocked_profile_id = $2', [viewer.id, row.id]);
    if (!mine) return null; // they blocked me: profile disappears
  }
  const inter = await q1<{ id: number; from_profile_id: string; status: string; mediation_requested: boolean; photos_shared_by_sender: boolean; photos_shared_by_receiver: boolean }>(
    `select id, from_profile_id, status::text, mediation_requested, photos_shared_by_sender, photos_shared_by_receiver from rishta_interests
      where (from_profile_id = $1 and to_profile_id = $2) or (from_profile_id = $2 and to_profile_id = $1) order by created_at desc limit 1`,
    [viewer.id, row.id],
  );
  const sent = inter?.from_profile_id === viewer.id;
  const clear = own || (await photoAccess(viewer.id, row.id));
  const photos = (await q<{ id: number }>('select id from rishta_photos where profile_id = $1 and is_approved and not is_rejected order by sort_order', [row.id])).map((p) => ({ id: p.id, clear }));
  await q('update rishta_profiles set views = views + 1 where id = $1', [row.id]).catch(() => {});
  const { guardian_name, guardian_phone, account_id: _a, ...safe } = row;
  return {
    ...safe,
    photos,
    blocked,
    interest: inter
      ? {
          id: inter.id,
          direction: sent ? 'sent' : 'received',
          status: inter.status,
          mediation: inter.mediation_requested,
          iShared: sent ? inter.photos_shared_by_sender : inter.photos_shared_by_receiver,
          theyShared: sent ? inter.photos_shared_by_receiver : inter.photos_shared_by_sender,
        }
      : null,
    contact: inter?.status === 'accepted' ? { name: guardian_name, phone: guardian_phone } : null,
  };
}

// ---------------- public preview (visitors) ----------------

export type PreviewCard = {
  reference: string; gender: string; age: number; marital_status: string; education: string; city_en: string | null; city_ur: string | null;
  current_country: string; is_premium: boolean;
};

/**
 * Recently approved profiles for visitors (Rishta landing + home page).
 * Only safe fields: no name, phone, caste, profession or photo. Full profile needs login.
 */
export async function previewProfiles(limit = 8): Promise<{ profiles: PreviewCard[]; total: { male: number; female: number } }> {
  const settings = await getSetting<{ enabled?: boolean }>('public.rishta_preview');
  if (settings?.enabled === false) return { profiles: [], total: { male: 0, female: 0 } };
  const [profiles, counts] = await Promise.all([
    q<PreviewCard>(
      `select p.reference, p.gender, date_part('year', age(p.date_of_birth))::int as age, p.marital_status, p.education,
              c.name_en as city_en, c.name_ur as city_ur, p.current_country,
              p.is_premium and (p.premium_until is null or p.premium_until > now()) as is_premium
         from rishta_profiles p left join cities c on c.id = p.native_city_id
        where ${ACTIVE} order by p.approved_at desc limit $1`,
      [limit],
    ),
    q<{ gender: string; n: number }>(`select p.gender, count(*)::int as n from rishta_profiles p where ${ACTIVE} group by p.gender`),
  ]);
  return {
    profiles,
    total: { male: counts.find((c) => c.gender === 'male')?.n ?? 0, female: counts.find((c) => c.gender === 'female')?.n ?? 0 },
  };
}

// ---------------- interests ----------------

export async function sendInterest(viewer: { id: string; is_premium: boolean }, reference: string): Promise<void> {
  const to = await q1<{ id: string }>(`select p.id from rishta_profiles p where p.reference = $1 and ${ACTIVE}`, [reference.toUpperCase()]);
  if (!to) throw new UserError('not_found', 'Profile not found');
  if (to.id === viewer.id) throw new UserError('self', 'This is your own profile');
  if (await q1('select 1 from rishta_blocks where (blocker_profile_id = $1 and blocked_profile_id = $2) or (blocker_profile_id = $2 and blocked_profile_id = $1)', [viewer.id, to.id])) {
    throw new UserError('blocked', 'You cannot send interest to this profile');
  }
  const { plan } = await getPlan();
  const limit = viewer.is_premium ? plan.premium_interests_per_day : plan.interests_per_day;
  const today = await q1<{ n: number }>(`select count(*)::int as n from rishta_interests where from_profile_id = $1 and created_at > now() - interval '24 hours'`, [viewer.id]);
  if ((today?.n ?? 0) >= limit) throw new UserError('limit', `Daily limit reached (${limit} interests in 24 hours).`);
  const existing = await q1('select 1 from rishta_interests where (from_profile_id = $1 and to_profile_id = $2) or (from_profile_id = $2 and to_profile_id = $1)', [viewer.id, to.id]);
  if (existing) throw new UserError('exists', 'Interest already exists between these profiles');
  await q('insert into rishta_interests (from_profile_id, to_profile_id) values ($1, $2)', [viewer.id, to.id]);
  // Push to the receiving family's phone (only their own profile number, no details)
  const rec = await q1<{ account_id: string; reference: string }>('select account_id, reference from rishta_profiles where id = $1', [to.id]);
  if (rec) await notifyRishta(rec.account_id, 'rishta_interest', rec.reference).catch(() => 0);
}

export async function respondInterest(viewerId: string, interestId: number, accept: boolean, sharePhotos: boolean): Promise<void> {
  const r = await q1(
    `update rishta_interests set status = $3::interest_status, responded_at = now(), photos_shared_by_receiver = $4
      where id = $1 and to_profile_id = $2 and status = 'sent' returning id`,
    [interestId, viewerId, accept ? 'accepted' : 'declined', accept && sharePhotos],
  );
  if (!r) throw new UserError('not_found', 'Interest not found');
  if (accept) {
    const s = await q1<{ account_id: string; reference: string }>(
      'select p.account_id, p.reference from rishta_interests i join rishta_profiles p on p.id = i.from_profile_id where i.id = $1',
      [interestId],
    );
    if (s) await notifyRishta(s.account_id, 'rishta_accepted', s.reference).catch(() => 0);
  }
}

export async function withdrawInterest(viewerId: string, interestId: number): Promise<void> {
  const r = await q1(`update rishta_interests set status = 'withdrawn' where id = $1 and from_profile_id = $2 and status = 'sent' returning id`, [interestId, viewerId]);
  if (!r) throw new UserError('not_found', 'Interest not found');
}

export async function sharePhotos(viewerId: string, interestId: number, share: boolean): Promise<void> {
  const r = await q1(
    `update rishta_interests set
        photos_shared_by_sender = case when from_profile_id = $2 then $3 else photos_shared_by_sender end,
        photos_shared_by_receiver = case when to_profile_id = $2 then $3 else photos_shared_by_receiver end
      where id = $1 and status = 'accepted' and (from_profile_id = $2 or to_profile_id = $2) returning id`,
    [interestId, viewerId, share],
  );
  if (!r) throw new UserError('not_found', 'Only accepted interests can share photos');
}

export async function requestMediation(viewerId: string, interestId: number, note: string): Promise<void> {
  const r = await q1(
    `update rishta_interests set mediation_requested = true, mediation_status = 'open', mediation_note = $3
      where id = $1 and (from_profile_id = $2 or to_profile_id = $2) and status in ('sent', 'accepted') returning id`,
    [interestId, viewerId, stripContacts(note).slice(0, 500) || null],
  );
  if (!r) throw new UserError('not_found', 'Interest not found');
}

export type InterestRow = {
  id: number; direction: 'sent' | 'received'; status: string; created_at: string; mediation_requested: boolean; i_shared: boolean;
  other: RishtaCard; contact: { name: string; phone: string } | null;
};

export async function myInterests(viewerId: string): Promise<InterestRow[]> {
  const rows = await q<{
    id: number; from_profile_id: string; status: string; created_at: string; mediation_requested: boolean; photos_shared_by_sender: boolean;
    photos_shared_by_receiver: boolean; other_ref: string; guardian_name: string; guardian_phone: string;
  }>(
    `select i.id, i.from_profile_id, i.status::text, i.created_at, i.mediation_requested, i.photos_shared_by_sender, i.photos_shared_by_receiver,
            o.reference as other_ref, o.guardian_name, o.guardian_phone
       from rishta_interests i join rishta_profiles o on o.id = case when i.from_profile_id = $1 then i.to_profile_id else i.from_profile_id end
      where (i.from_profile_id = $1 or i.to_profile_id = $1) and i.status <> 'withdrawn' and o.status = 'approved'
      order by i.created_at desc limit 200`,
    [viewerId],
  );
  const refs = rows.map((r) => r.other_ref);
  const cards = refs.length ? await q<RishtaCard>(`${CARD} where p.reference = any($1)`, [refs]) : [];
  return rows.map((r) => {
    const sent = r.from_profile_id === viewerId;
    return {
      id: r.id,
      direction: sent ? 'sent' : 'received',
      status: r.status,
      created_at: r.created_at,
      mediation_requested: r.mediation_requested,
      i_shared: sent ? r.photos_shared_by_sender : r.photos_shared_by_receiver,
      other: cards.find((c) => c.reference === r.other_ref)!,
      contact: r.status === 'accepted' ? { name: r.guardian_name, phone: r.guardian_phone } : null,
    };
  });
}

// ---------------- safety ----------------

export async function blockProfile(viewerId: string, reference: string, unblock = false): Promise<void> {
  const t = await q1<{ id: string }>('select id from rishta_profiles where reference = $1', [reference.toUpperCase()]);
  if (!t || t.id === viewerId) throw new UserError('not_found', 'Profile not found');
  if (unblock) await q('delete from rishta_blocks where blocker_profile_id = $1 and blocked_profile_id = $2', [viewerId, t.id]);
  else await q('insert into rishta_blocks (blocker_profile_id, blocked_profile_id) values ($1, $2) on conflict do nothing', [viewerId, t.id]);
}

export async function reportProfile(viewerId: string, reference: string, reason: string): Promise<void> {
  const t = await q1<{ id: string }>('select id from rishta_profiles where reference = $1', [reference.toUpperCase()]);
  if (!t || t.id === viewerId) throw new UserError('not_found', 'Profile not found');
  const text = reason.trim();
  if (text.length < 3) throw new UserError('reason', 'Write what is wrong');
  await q('insert into rishta_reports (profile_id, reported_by, reason) values ($1, $2, $3)', [t.id, viewerId, text.slice(0, 500)]);
}

export async function touchActive(profileId: string): Promise<void> {
  await q('update rishta_profiles set last_active_at = now() where id = $1', [profileId]).catch(() => {});
}
