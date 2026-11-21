'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q1, tx } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { bool, str } from '@/lib/admin/form';

const ROLES = ['super_admin', 'moderator', 'blog_writer', 'rishta_coordinator'];

function back(error?: string): never {
  revalidatePath('/admin/users');
  redirect(error ? `/admin/users?error=${encodeURIComponent(error)}` : '/admin/users?saved=1');
}

export async function createAdminUser(fd: FormData) {
  const admin = await requireAdmin();
  const email = str(fd, 'email').toLowerCase();
  const fullName = str(fd, 'full_name');
  const role = str(fd, 'role');
  const password = str(fd, 'password');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back('Enter a valid email.');
  if (!fullName) back('Enter the full name.');
  if (!ROLES.includes(role)) back('Choose a role.');
  if (password.length < 10) back('Password must be at least 10 characters.');
  if (await q1('select 1 from auth.users where email = $1', [email])) back('An account with this email already exists.');

  const hash = await bcrypt.hash(password, 10);
  const id = await tx(async (c) => {
    const u = await c.query<{ id: string }>('insert into auth.users (email, encrypted_password) values ($1, $2) returning id', [email, hash]);
    await c.query('insert into admin_users (id, full_name, role) values ($1, $2, $3)', [u.rows[0].id, fullName, role]);
    return u.rows[0].id;
  });
  await logActivity(admin.id, 'admin_user.create', 'admin_users', id, { email, role });
  back();
}

export async function updateAdminUser(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, 'id');
  const role = str(fd, 'role');
  const isActive = bool(fd, 'is_active');
  const fullName = str(fd, 'full_name');
  if (!ROLES.includes(role) || !fullName) back('Name and role are required.');
  if (id === admin.id && (!isActive || role !== 'super_admin')) {
    back('You cannot turn off or lower your own account. Ask another Super Admin.');
  }
  await tx(async (c) => {
    await c.query('update admin_users set full_name = $2, role = $3, is_active = $4 where id = $1', [id, fullName, role, isActive]);
    const supers = await c.query("select count(*)::int as n from admin_users where role = 'super_admin' and is_active");
    if (supers.rows[0].n < 1) throw new Error('last-super');
  }).catch((e: Error) => {
    if (e.message === 'last-super') back('There must always be at least one active Super Admin.');
    throw e;
  });
  const newPassword = str(fd, 'new_password');
  if (newPassword) {
    if (newPassword.length < 10) back('New password must be at least 10 characters.');
    await q1('update auth.users set encrypted_password = $2 where id = $1', [id, await bcrypt.hash(newPassword, 10)]);
  }
  await logActivity(admin.id, 'admin_user.update', 'admin_users', id, { role, is_active: isActive, password_changed: !!newPassword });
  back();
}
