import { NextResponse } from 'next/server';
import { UserError } from '@/lib/errors';
import { fail, noStore, requireMember } from '@/lib/rishta/api';
import { viewProfile } from '@/lib/rishta/profiles';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, props: { params: Promise<{ ref: string }> }) {
  const params = await props.params;
  try {
    const { account, profile } = await requireMember();
    if (!/^R-\d{3,10}$/i.test(params.ref)) throw new UserError('not_found', 'Profile not found');
    const p = await viewProfile({ id: profile.id, accountId: account.id }, params.ref);
    if (!p) throw new UserError('not_found', 'Profile not found');
    const { id: _id, ...safe } = p;
    return NextResponse.json({ profile: safe }, { headers: noStore });
  } catch (e) {
    return fail(e);
  }
}
