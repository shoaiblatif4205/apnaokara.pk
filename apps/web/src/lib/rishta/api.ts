import { NextResponse } from 'next/server';
import { UserError } from '@/lib/errors';
import { getRishtaAccount, type RishtaAccount } from './session';
import { getActiveProfile, touchActive } from './profiles';

// Small helpers for the /api/rishta/* routes (used by the website forms and the app).

export const noStore = { 'Cache-Control': 'private, no-store' };

export function fail(e: unknown) {
  if (e instanceof UserError) {
    const status = e.code === 'not_found' ? 404 : e.code === 'auth' ? 401 : e.code === 'no_profile' ? 403 : 400;
    return NextResponse.json({ error: e.code, message: e.message }, { status, headers: noStore });
  }
  console.error('rishta api error', e);
  return NextResponse.json({ error: 'server', message: 'Something went wrong' }, { status: 500, headers: noStore });
}

export async function requireAccount(): Promise<RishtaAccount> {
  const a = await getRishtaAccount();
  if (!a) throw new UserError('auth', 'Please log in');
  return a;
}

/** Logged in AND has an approved, not expired profile (needed to search, view and send interests). */
export async function requireMember() {
  const account = await requireAccount();
  const profile = await getActiveProfile(account);
  if (!profile) throw new UserError('no_profile', 'Your profile must be approved before you can see other profiles.');
  void touchActive(profile.id);
  return { account, profile };
}
