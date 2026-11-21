import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/admin/auth';
import { directPublicUrl, PUBLIC_BUCKETS, readObject, type Bucket } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Serves uploaded files (local development). Private buckets (payment
// screenshots, rishta photos) are only shown to logged-in admins.
export async function GET(_req: Request, props: { params: Promise<{ bucket: string; path: string[] }> }) {
  const params = await props.params;
  const bucket = params.bucket as Bucket;
  const key = params.path.join('/');
  const isPublic = PUBLIC_BUCKETS.includes(bucket);
  // Backups contain everything: never served here (Super Admin downloads them from Admin -> Backups)
  if (bucket === 'backups') return new NextResponse('Not found', { status: 404 });
  // Rishta photos only through /api/rishta/photo/<id> (blur, watermark and family-consent rules)
  if (bucket === 'rishta-photos') return new NextResponse('Not found', { status: 404 });
  if (!isPublic) {
    // Payment screenshots: only the people who verify payments
    const admin = await getAdmin();
    const allowed =
      !!admin && (admin.role === 'super_admin' || admin.role === 'moderator' || (admin.role === 'rishta_coordinator' && key.startsWith('rishta/')));
    if (!allowed) return new NextResponse('Not found', { status: 404 });
  }
  if (!/^[\w./-]+$/.test(key) || key.includes('..')) return new NextResponse('Not found', { status: 404 });

  // Live site: public photos come straight from Supabase's file server (fast, and not counted against Vercel)
  const direct = isPublic ? directPublicUrl(bucket, key) : null;
  if (direct) return NextResponse.redirect(direct, { status: 308, headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } });

  const data = await readObject(bucket, key);
  if (!data) return new NextResponse('Not found', { status: 404 });
  const type = key.endsWith('.webp') ? 'image/webp' : key.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': type,
      'Cache-Control': isPublic ? 'public, max-age=31536000, immutable' : 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
