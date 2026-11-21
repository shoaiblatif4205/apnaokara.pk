import { createHash, randomInt } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { q, q1, tx } from '@/lib/db';
import { UserError } from '@/lib/errors';
import { normalizePhone } from '@/lib/phone';
import { emailConfigured, sendEmail } from '@/lib/email';

// Rishta login: email + required phone number + one-time code sent to the email. No passwords.
// Website: httpOnly cookie. App: the same token sent as "Authorization: Bearer".

const COOKIE = 'ao_rishta';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const OTP_MINUTES = 10;

function secret(): Uint8Array {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('ADMIN_SESSION_SECRET (32+ characters) is missing in apps/web/.env.local');
  return new TextEncoder().encode(s);
}

const hashCode = (phone: string, code: string) =>
  createHash('sha256').update(`${phone}:${code}:${process.env.ADMIN_SESSION_SECRET}`).digest('hex');

export type RishtaAccount = { id: string; phone: string };

export async function createRishtaToken(accountId: string): Promise<string> {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(accountId).setAudience('rishta').setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
}

export async function setRishtaCookie(token: string) {
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: MAX_AGE });
}

export async function clearRishtaCookie() {
  (await cookies()).set(COOKIE, '', { path: '/', maxAge: 0 });
}

export async function getRishtaAccount(): Promise<RishtaAccount | null> {
  const auth = (await headers()).get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: 'rishta', algorithms: ['HS256'] });
    if (!payload.sub) return null;
    const acc = await q1<{ id: string; phone: string; is_blocked: boolean }>('select id, phone, is_blocked from rishta_accounts where id = $1', [payload.sub]);
    if (!acc || acc.is_blocked) return null;
    return { id: acc.id, phone: acc.phone };
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const cleanEmail = (e: string) => e.trim().toLowerCase().slice(0, 200);

/** One account = one email + phone pair (phone is required; the code goes to the email). */
async function checkPair(email: string, phone: string) {
  const byEmail = await q1<{ phone: string; is_blocked: boolean }>('select phone, is_blocked from rishta_accounts where lower(email) = $1', [email]);
  if (byEmail?.is_blocked) throw new UserError('blocked', 'This account is blocked.');
  if (byEmail && byEmail.phone !== phone) {
    throw new UserError('pair', 'This email is registered with a different phone number. Use the same number you signed up with.');
  }
  if (!byEmail) {
    const byPhone = await q1<{ email: string | null; is_blocked: boolean }>('select email, is_blocked from rishta_accounts where phone = $1', [phone]);
    if (byPhone?.is_blocked) throw new UserError('blocked', 'This account is blocked.');
    if (byPhone?.email && byPhone.email.toLowerCase() !== email) throw new UserError('pair', 'This phone number is already registered with another email.');
  }
}

function codeEmail(code: string, locale: 'en' | 'ur') {
  const ur = locale === 'ur';
  const note = ur
    ? `یہ کوڈ ${OTP_MINUTES} منٹ تک کام کرے گا۔ یہ کوڈ کسی کو نہ بتائیں۔ اگر آپ نے یہ نہیں مانگا تو یہ ای میل نظر انداز کریں۔`
    : `It works for ${OTP_MINUTES} minutes. Never share this code. If you did not ask for it, ignore this email.`;
  const title = ur ? 'اپنا اوکاڑہ رشتہ' : 'Apna Okara Rishta';
  const label = ur ? 'آپ کا لاگ ان کوڈ:' : 'Your login code:';
  return {
    subject: ur ? `اپنا اوکاڑہ رشتہ: آپ کا کوڈ ${code}` : `Apna Okara Rishta: your code ${code}`,
    text: `${label} ${code}\n\n${note}\n\nApna Okara`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px"${ur ? ' dir="rtl"' : ''}>
<h2 style="color:#15803D;margin:0 0 12px">${title}</h2><p>${label}</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:8px 0;color:#111" dir="ltr">${code}</p>
<p style="color:#6b7280;font-size:14px">${note}</p></div>`,
  };
}

/** Send a login code to the email. Phone number is required. Returns the code itself only in local development. */
export async function requestOtp(emailInput: string, phoneInput: string, locale: 'en' | 'ur' = 'ur'): Promise<{ devCode?: string; sentTo: string }> {
  const email = cleanEmail(emailInput);
  if (!EMAIL_RE.test(email)) throw new UserError('email', 'Enter a valid email address');
  const phone = normalizePhone(phoneInput);
  if (!phone) throw new UserError('phone', 'Enter a valid Pakistani mobile number');
  if (await q1('select 1 from blocked_phones where phone = $1', [phone])) throw new UserError('blocked', 'This number cannot use Rishta.');
  await checkPair(email, phone);
  const recent = await q1<{ n: number }>(
    `select count(*)::int as n from rishta_otps where lower(email) = $1 and created_at > now() - interval '10 minutes'`,
    [email],
  );
  if ((recent?.n ?? 0) >= 3) throw new UserError('rate', 'Too many codes. Wait 10 minutes and try again.');

  const code = String(randomInt(100000, 1000000));
  await q(`insert into rishta_otps (email, phone, code_hash, expires_at) values ($1, $2, $3, now() + make_interval(mins => $4))`, [
    email, phone, hashCode(email, code), OTP_MINUTES,
  ]);

  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[rishta] login code for ${email}: ${code}`);
      return { devCode: code, sentTo: email };
    }
    throw new UserError('email', 'Email login is being set up. Please try again later.');
  }
  await sendEmail({ to: email, ...codeEmail(code, locale) });
  return { sentTo: email };
}

/** Check the code; creates the account the first time (with the required phone number). */
export async function verifyOtp(emailInput: string, phoneInput: string, code: string): Promise<{ account: RishtaAccount; token: string }> {
  const email = cleanEmail(emailInput);
  const phone = normalizePhone(phoneInput);
  if (!EMAIL_RE.test(email) || !phone || !/^\d{6}$/.test(code.trim())) throw new UserError('code', 'Enter the 6-digit code');
  const otp = await q1<{ id: number; code_hash: string; attempts: number; phone: string | null }>(
    `select id, code_hash, attempts, phone from rishta_otps where lower(email) = $1 and used_at is null and expires_at > now() order by created_at desc limit 1`,
    [email],
  );
  if (!otp) throw new UserError('code', 'The code has expired. Ask for a new one.');
  if (otp.attempts >= 5) throw new UserError('code', 'Too many wrong tries. Ask for a new code.');
  if (otp.code_hash !== hashCode(email, code.trim()) || otp.phone !== phone) {
    await q('update rishta_otps set attempts = attempts + 1 where id = $1', [otp.id]);
    throw new UserError('code', 'Wrong code');
  }
  await checkPair(email, phone);
  const account = await tx(async (c) => {
    await c.query('update rishta_otps set used_at = now() where id = $1', [otp.id]);
    const found = await c.query<{ id: string; is_blocked: boolean }>(
      'select id, is_blocked from rishta_accounts where lower(email) = $1 or (email is null and phone = $2) limit 1',
      [email, phone],
    );
    if (found.rows[0]) {
      if (found.rows[0].is_blocked) throw new UserError('blocked', 'This account is blocked.');
      await c.query('update rishta_accounts set email = coalesce(email, $2) where id = $1', [found.rows[0].id, email]);
      return { id: found.rows[0].id, phone };
    }
    let user = (await c.query<{ id: string }>('select id from auth.users where lower(email) = $1', [email])).rows[0];
    if (!user) {
      user = (await c.query<{ id: string }>('insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id', [email])).rows[0];
    }
    await c.query('insert into rishta_accounts (id, phone, email) values ($1, $2, $3)', [user.id, phone, email]);
    return { id: user.id, phone };
  });
  return { account, token: await createRishtaToken(account.id) };
}
