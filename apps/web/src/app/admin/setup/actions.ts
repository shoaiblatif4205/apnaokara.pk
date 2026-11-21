'use server';

import { timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { q1, tx } from '@/lib/db';
import { createSession } from '@/lib/admin/auth';
import { runMigrations } from '@/lib/migrate';
import { logActivity } from '@/lib/admin/log';
import { str } from '@/lib/admin/form';

// One-time creation of the first Super Admin on the live site.
// Works only while there is no admin at all, and only with ADMIN_SETUP_KEY
// (set by the owner in Vercel). The owner types their own email and password.

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

async function hasAdmin(): Promise<boolean> {
  try {
    return !!(await q1('select 1 from admin_users limit 1'));
  } catch {
    return false; // tables not created yet
  }
}

/** Step 1: create all tables and the starting data (only before the first admin exists). */
export async function prepareDatabase(fd: FormData) {
  const setupKey = process.env.ADMIN_SETUP_KEY ?? '';
  if (setupKey.length < 24) redirect('/admin/setup?error=disabled');
  if (await hasAdmin()) redirect('/admin/login');
  if (!same(str(fd, 'setup_key'), setupKey)) redirect('/admin/setup?error=key');
  let msg: string;
  try {
    const r = await runMigrations();
    msg = `ok:${r.applied.length}:${r.seeded ? 1 : 0}`;
  } catch (e) {
    msg = `fail:${String(e instanceof Error ? e.message : e).slice(0, 300)}`;
  }
  redirect(`/admin/setup?db=${encodeURIComponent(msg)}`);
}

export async function createFirstAdmin(fd: FormData) {
  const setupKey = process.env.ADMIN_SETUP_KEY ?? '';
  if (setupKey.length < 24) redirect('/admin/setup?error=disabled');
  if (await hasAdmin()) redirect('/admin/login');

  if (!same(str(fd, 'setup_key'), setupKey)) redirect('/admin/setup?error=key');
  const email = str(fd, 'email').toLowerCase();
  const name = str(fd, 'full_name') || 'Owner';
  const password = str(fd, 'password');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect('/admin/setup?error=email');
  if (password.length < 12 || password !== str(fd, 'password2')) redirect('/admin/setup?error=password');

  const hash = await bcrypt.hash(password, 12);
  const id = await tx(async (c) => {
    // Check again inside the transaction so two people cannot both become the first admin
    await c.query('lock table admin_users in exclusive mode');
    const again = await c.query('select 1 from admin_users limit 1');
    if (again.rowCount) return null;
    const found = await c.query<{ id: string }>('select id from auth.users where email = $1', [email]);
    const u = found.rowCount
      ? await c.query<{ id: string }>('update auth.users set encrypted_password = $2 where id = $1 returning id', [found.rows[0].id, hash])
      : await c.query<{ id: string }>('insert into auth.users (id, email, encrypted_password) values (gen_random_uuid(), $1, $2) returning id', [email, hash]);
    await c.query(`insert into admin_users (id, full_name, role, is_active) values ($1, $2, 'super_admin', true)`, [u.rows[0].id, name]);
    return u.rows[0].id;
  });
  if (!id) redirect('/admin/login');
  await logActivity(id, 'admin.first_setup', 'admin_users', id);
  await createSession(id);
  redirect('/admin');
}
