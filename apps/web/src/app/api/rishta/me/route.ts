import { NextResponse, type NextRequest } from 'next/server';
import { q1 } from '@/lib/db';
import { UserError } from '@/lib/errors';
import { fail, noStore, requireAccount } from '@/lib/rishta/api';
import { getActiveProfile, getPlan, myProfiles, setActiveProfileCookie } from '@/lib/rishta/profiles';

export const dynamic = 'force-dynamic';

// GET -> account, my profiles, active profile, plan
export async function GET() {
  try {
    const account = await requireAccount();
    const [profiles, active, { plan, free }] = await Promise.all([myProfiles(account.id), getActiveProfile(account), getPlan()]);
    return NextResponse.json({ phone: account.phone, profiles, active, plan, free }, { headers: noStore });
  } catch (e) {
    return fail(e);
  }
}

// POST { profileId } -> act as this profile
export async function POST(req: NextRequest) {
  try {
    const account = await requireAccount();
    const { profileId } = (await req.json().catch(() => ({}))) as { profileId?: string };
    const own = profileId ? await q1('select 1 from rishta_profiles where id = $1 and account_id = $2', [profileId, account.id]) : null;
    if (!own) throw new UserError('not_found', 'Profile not found');
    await setActiveProfileCookie(profileId!);
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return fail(e);
  }
}
