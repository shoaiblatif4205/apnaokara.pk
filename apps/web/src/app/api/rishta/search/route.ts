import { NextResponse, type NextRequest } from 'next/server';
import { fail, noStore, requireMember } from '@/lib/rishta/api';
import { searchProfiles } from '@/lib/rishta/profiles';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { account, profile } = await requireMember();
    const s = req.nextUrl.searchParams;
    const num = (k: string) => {
      const n = Number.parseInt(s.get(k) ?? '', 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const result = await searchProfiles(
      { id: profile.id, gender: profile.gender, accountId: account.id },
      {
        gender: s.get('gender') ?? undefined,
        ageMin: num('ageMin'),
        ageMax: num('ageMax'),
        city: s.get('city') ?? undefined,
        country: s.get('country') ?? undefined,
        education: s.get('education') ?? undefined,
        caste: s.get('caste') ?? undefined,
        sect: s.get('sect') ?? undefined,
        maritalStatus: s.get('marital') ?? undefined,
        withPhoto: s.get('photo') === '1',
        sort: s.get('sort') === 'active' ? 'active' : 'new',
        page: num('page'),
      },
    );
    return NextResponse.json(result, { headers: noStore });
  } catch (e) {
    return fail(e);
  }
}
