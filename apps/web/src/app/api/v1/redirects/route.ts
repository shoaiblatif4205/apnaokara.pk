import { NextResponse } from 'next/server';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Redirect list for the middleware (Admin -> SEO -> Redirects).
export async function GET() {
  const rows = await q<{ from_path: string; to_path: string; status_code: number }>('select from_path, to_path, status_code from redirects');
  return NextResponse.json(rows.map((r) => [r.from_path, r.to_path, r.status_code]), { headers: { 'Cache-Control': 'no-store' } });
}
