'use server';

import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { q, q1 } from '@/lib/db';
import { createSession, destroySession, getAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { str } from '@/lib/admin/form';
import { clientIp } from '@/lib/phone';

// Brute-force protection, stored in the database so it works on every server copy:
// 5 wrong tries for an email, or 20 from one internet address = locked for 15 minutes.
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;
const LOCK_MINUTES = 15;
// Compared when the email does not exist, so the answer takes the same time either way
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.0G6k8Q7sY3m0p6o2h8w7s1zv6q8a';

async function locked(keys: string[]): Promise<boolean> {
  const r = await q1('select 1 from admin_login_attempts where key = any($1) and locked_until > now()', [keys]);
  return !!r;
}

async function recordFailure(key: string, max: number) {
  await q(
    `insert into admin_login_attempts (key, failures, updated_at) values ($1, 1, now())
     on conflict (key) do update set
       failures = case when admin_login_attempts.updated_at < now() - make_interval(mins => $3::int) then 1 else admin_login_attempts.failures + 1 end,
       locked_until = case when (case when admin_login_attempts.updated_at < now() - make_interval(mins => $3::int) then 1 else admin_login_attempts.failures + 1 end) >= $2
                           then now() + make_interval(mins => $3::int) else admin_login_attempts.locked_until end,
       updated_at = now()`,
    [key, max, LOCK_MINUTES],
  );
}

export async function login(formData: FormData) {
  const email = str(formData, 'email').toLowerCase().slice(0, 200);
  const password = str(formData, 'password').slice(0, 200);
  if (!email || !password) redirect('/admin/login?error=missing');

  const ip = clientIp(await headers());
  const keys = [`email:${email}`, `ip:${ip}`];
  if (await locked(keys)) redirect('/admin/login?error=locked');

  const user = await q1<{ id: string; encrypted_password: string | null; is_active: boolean | null }>(
    `select u.id, u.encrypted_password, a.is_active
       from auth.users u left join admin_users a on a.id = u.id
      where u.email = $1`,
    [email],
  );

  const ok = await bcrypt.compare(password, user?.encrypted_password || DUMMY_HASH);
  if (!ok || !user?.encrypted_password || !user.is_active) {
    await recordFailure(keys[0], MAX_PER_EMAIL);
    await recordFailure(keys[1], MAX_PER_IP);
    await logActivity(null, 'admin.login_failed', 'admin_users', null, { email, ip });
    redirect('/admin/login?error=invalid');
  }

  await q('delete from admin_login_attempts where key = $1', [keys[0]]);
  await q('update auth.users set last_sign_in_at = now() where id = $1', [user.id]);
  await createSession(user.id);
  await logActivity(user.id, 'admin.login', 'admin_users', user.id, { ip });
  redirect('/admin');
}

export async function logout() {
  const admin = await getAdmin();
  if (admin) await logActivity(admin.id, 'admin.logout', 'admin_users', admin.id);
  await destroySession();
  redirect('/admin/login');
}
