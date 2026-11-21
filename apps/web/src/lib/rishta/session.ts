import { createHash, randomInt } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { q, q1, tx } from '@/lib/db';
import { UserError } from '@/lib/errors';
import { normalizePhone } from '@/lib/phone';

// Rishta login: phone number + one-time code (OTP). No passwords.
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

/** Send a login code. Returns the code itself only in local development. */
export async function requestOtp(phoneInput: string): Promise<{ devCode?: string }> {
  const phone = normalizePhone(phoneInput);
  if (!phone) throw new UserError('phone', 'Enter a valid Pakistani mobile number');
  if (await q1('select 1 from blocked_phones where phone = $1', [phone])) throw new UserError('blocked', 'This number cannot use Rishta.');
  if (await q1('select 1 from rishta_accounts where phone = $1 and is_blocked', [phone])) throw new UserError('blocked', 'This account is blocked.');
  const recent = await q1<{ n: number }>(`select count(*)::int as n from rishta_otps where phone = $1 and created_at > now() - interval '10 minutes'`, [phone]);
  if ((recent?.n ?? 0) >= 3) throw new UserError('rate', 'Too many codes. Wait 10 minutes and try again.');

  const code = String(randomInt(100000, 1000000));
  await q(`insert into rishta_otps (phone, code_hash, expires_at) values ($1, $2, now() + make_interval(mins => $3))`, [phone, hashCode(phone, code), OTP_MINUTES]);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[rishta] login code for ${phone}: ${code}`);
    return { devCode: code };
  }
  // Live site: send by SMS / WhatsApp here (provider chosen at deployment).
  throw new UserError('sms', 'SMS sending is not set up yet.');
}

/** Check the code; creates the account the first time. */
export async function verifyOtp(phoneInput: string, code: string): Promise<{ account: RishtaAccount; token: string }> {
  const phone = normalizePhone(phoneInput);
  if (!phone || !/^\d{6}$/.test(code.trim())) throw new UserError('code', 'Enter the 6-digit code');
  const otp = await q1<{ id: number; code_hash: string; attempts: number }>(
    `select id, code_hash, attempts from rishta_otps where phone = $1 and used_at is null and expires_at > now() order by created_at desc limit 1`,
    [phone],
  );
  if (!otp) throw new UserError('code', 'The code has expired. Ask for a new one.');
  if (otp.attempts >= 5) throw new UserError('code', 'Too many wrong tries. Ask for a new code.');
  if (otp.code_hash !== hashCode(phone, code.trim())) {
    await q('update rishta_otps set attempts = attempts + 1 where id = $1', [otp.id]);
    throw new UserError('code', 'Wrong code');
  }
  const account = await tx(async (c) => {
    await c.query('update rishta_otps set used_at = now() where id = $1', [otp.id]);
    const found = await c.query<{ id: string; is_blocked: boolean }>('select id, is_blocked from rishta_accounts where phone = $1', [phone]);
    if (found.rows[0]) {
      if (found.rows[0].is_blocked) throw new UserError('blocked', 'This account is blocked.');
      return { id: found.rows[0].id, phone };
    }
    let user = (await c.query<{ id: string }>('select id from auth.users where phone = $1', [phone])).rows[0];
    if (!user) user = (await c.query<{ id: string }>('insert into auth.users (phone) values ($1) returning id', [phone])).rows[0];
    await c.query('insert into rishta_accounts (id, phone) values ($1, $2)', [user.id, phone]);
    return { id: user.id, phone };
  });
  return { account, token: await createRishtaToken(account.id) };
}
