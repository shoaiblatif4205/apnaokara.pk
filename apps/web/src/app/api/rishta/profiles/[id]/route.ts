import { NextResponse, type NextRequest } from 'next/server';
import { q1 } from '@/lib/db';
import { UserError } from '@/lib/errors';
import { fail, noStore, requireAccount } from '@/lib/rishta/api';
import { addPhoto, payForProfile, profilePhotos, removePhoto, updateProfile } from '@/lib/rishta/profiles';

export const dynamic = 'force-dynamic';

// GET -> my own profile (all fields, for the edit form)
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const account = await requireAccount();
    const p = await q1<Record<string, unknown>>(
      `select id, reference, status::text, reject_reason, created_by, full_name, gender, to_char(date_of_birth, 'YYYY-MM-DD') as date_of_birth, height_cm,
              complexion, marital_status, children, religion, sect, caste, education, profession, income_range, native_city_id, native_locality_id,
              current_city, current_country, house_type, father_profession, mother_profession, brothers, sisters, married_siblings, family_type, about,
              looking_for, guardian_name, guardian_phone, expires_at, is_premium, premium_until
         from rishta_profiles where id = $1 and account_id = $2`,
      [params.id, account.id],
    );
    if (!p) throw new UserError('not_found', 'Profile not found');
    const [photos, pendingPay] = await Promise.all([
      profilePhotos(params.id),
      q1(`select 1 from payments where rishta_profile_id = $1 and status = 'pending'`, [params.id]),
    ]);
    return NextResponse.json({ profile: p, photos, pendingPayment: !!pendingPay }, { headers: noStore });
  } catch (e) {
    return fail(e);
  }
}

// POST JSON { action: 'update', data } | multipart { action: 'photo', photo } | { action: 'remove_photo', photoId } | multipart { action: 'pay', ... }
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const account = await requireAccount();
    if (req.headers.get('content-type')?.includes('application/json')) {
      const b = (await req.json().catch(() => ({}))) as { action?: string; data?: unknown; photoId?: number };
      if (b.action === 'update') await updateProfile(account, params.id, b.data);
      else if (b.action === 'remove_photo') await removePhoto(account, Number(b.photoId));
      else throw new UserError('bad_request', 'Unknown action');
      return NextResponse.json({ ok: true }, { headers: noStore });
    }
    const form = await req.formData();
    const action = String(form.get('action') ?? '');
    if (action === 'photo') await addPhoto(account, params.id, form.get('photo'));
    else if (action === 'pay') await payForProfile(account, params.id, form);
    else throw new UserError('bad_request', 'Unknown action');
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return fail(e);
  }
}
