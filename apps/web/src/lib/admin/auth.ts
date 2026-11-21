import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { q1 } from '@/lib/db';

// Admin login sessions (local version).
// Passwords are bcrypt hashes in auth.users.encrypted_password.
// At deployment this switches to Supabase Auth; the rest of the admin
// panel only uses getAdmin() / requireAdmin(), so nothing else changes.

export type AdminRole = 'super_admin' | 'moderator' | 'blog_writer' | 'rishta_coordinator';

export type AdminSession = {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  moderator: 'Moderator',
  blog_writer: 'Blog Writer',
  rishta_coordinator: 'Rishta Coordinator',
};

const COOKIE = 'ao_admin';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): Uint8Array {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET (32+ characters) is missing in apps/web/.env.local');
  }
  return new TextEncoder().encode(s);
}

export async function createSession(adminId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(adminId)
    .setAudience('admin')
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    // "/" so private files (/api/files/payment-screenshots/...) also see the login
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, '', { path: '/', maxAge: 0 });
  jar.set(COOKIE, '', { path: '/admin', maxAge: 0 }); // older sessions
}

export async function getAdmin(): Promise<AdminSession | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: 'admin', algorithms: ['HS256'] });
    if (!payload.sub) return null;
    const row = await q1<{ id: string; email: string; full_name: string; role: AdminRole }>(
      `select a.id, u.email, a.full_name, a.role
         from admin_users a join auth.users u on u.id = a.id
        where a.id = $1 and a.is_active`,
      [payload.sub],
    );
    return row ? { id: row.id, email: row.email, fullName: row.full_name, role: row.role } : null;
  } catch {
    return null;
  }
}

/**
 * Use at the top of every admin page and action.
 * Super Admin can do everything; other roles only what is listed.
 */
export async function requireAdmin(allowed?: AdminRole[]): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  if (allowed && admin.role !== 'super_admin' && !allowed.includes(admin.role)) {
    redirect('/admin?denied=1');
  }
  return admin;
}

export function can(admin: AdminSession, allowed: AdminRole[]): boolean {
  return admin.role === 'super_admin' || allowed.includes(admin.role);
}
