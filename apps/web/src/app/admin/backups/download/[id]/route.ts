import { NextResponse } from 'next/server';
import { q1 } from '@/lib/db';
import { getAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { readObject } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Download a database backup. Super Admin only; every download is logged.
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const admin = await getAdmin();
  if (!admin || admin.role !== 'super_admin') return new NextResponse('Not found', { status: 404 });
  const b = await q1<{ file_name: string }>(`select file_name from backups where id = $1 and status = 'done'`, [Number(params.id) || 0]);
  if (!b) return new NextResponse('Not found', { status: 404 });
  const data = await readObject('backups', b.file_name);
  if (!data) return new NextResponse('File missing', { status: 404 });
  await logActivity(admin.id, 'backup.download', 'backups', params.id);
  return new NextResponse(new Uint8Array(data), {
    headers: { 'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="${b.file_name}"`, 'Cache-Control': 'no-store' },
  });
}
