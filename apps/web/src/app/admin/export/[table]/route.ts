import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { getAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { exportableTables, exportColumns } from '@/lib/admin/exportTables';

export const dynamic = 'force-dynamic';

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // stop Excel formulas
  return `"${safe.replace(/"/g, '""')}"`;
};

// Any table as CSV (opens in Excel, Urdu kept with UTF-8 BOM). Super Admin only.
export async function GET(_req: Request, props: { params: Promise<{ table: string }> }) {
  const params = await props.params;
  const admin = await getAdmin();
  if (!admin || admin.role !== 'super_admin') return new NextResponse('Not found', { status: 404 });
  const table = params.table;
  if (!(await exportableTables()).some((t) => t.name === table)) return new NextResponse('Not found', { status: 404 });
  const cols = await exportColumns(table);
  const rows = await q<Record<string, unknown>>(`select ${cols.map((c) => `"${c}"`).join(', ')} from public."${table}" limit 200000`);
  const csv = '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
  await logActivity(admin.id, 'table.export', table, null, { rows: rows.length });
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="apna-okara-${table}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
