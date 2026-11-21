import { NextResponse, type NextRequest } from 'next/server';
import { q1 } from '@/lib/db';
import { getAdmin } from '@/lib/admin/auth';
import { readObject } from '@/lib/storage';
import { getRishtaAccount } from '@/lib/rishta/session';
import { getActiveProfile, photoAccess } from '@/lib/rishta/profiles';

export const dynamic = 'force-dynamic';

// Rishta photo with privacy rules:
//  - admin (Super Admin / Rishta Coordinator) and the owner: clear photo
//  - member the owner shared photos with (after mutual interest): clear, watermarked
//  - other approved members: blurred
//  - everyone else: nothing
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id)) return new NextResponse('Not found', { status: 404 });
  const photo = await q1<{ storage_path: string; watermarked_path: string | null; blurred_path: string | null; is_approved: boolean; is_rejected: boolean; profile_id: string; account_id: string; status: string }>(
    `select f.storage_path, f.watermarked_path, f.blurred_path, f.is_approved, f.is_rejected, f.profile_id, p.account_id, p.status::text
       from rishta_photos f join rishta_profiles p on p.id = f.profile_id where f.id = $1`,
    [id],
  );
  if (!photo) return new NextResponse('Not found', { status: 404 });
  const wantClear = req.nextUrl.searchParams.get('v') === 'clear';

  let path: string | null = null;
  const admin = await getAdmin();
  if (admin && (admin.role === 'super_admin' || admin.role === 'rishta_coordinator')) {
    path = wantClear ? photo.storage_path : photo.watermarked_path;
  } else {
    const account = await getRishtaAccount();
    if (account && account.id === photo.account_id) {
      path = photo.watermarked_path;
    } else if (account && photo.is_approved && !photo.is_rejected && photo.status === 'approved') {
      const viewer = await getActiveProfile(account);
      if (viewer) path = wantClear && (await photoAccess(viewer.id, photo.profile_id)) ? photo.watermarked_path : photo.blurred_path;
    }
  }
  if (!path) return new NextResponse('Not found', { status: 404 });
  const data = await readObject('rishta-photos', path);
  if (!data) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' },
  });
}
