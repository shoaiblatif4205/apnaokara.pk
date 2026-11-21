import { NextResponse, type NextRequest } from 'next/server';
import { q } from '@/lib/db';
import { getAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { PAYMENTS_FROM, paymentsWhere, readPaymentFilters } from '@/lib/admin/paymentsQuery';

export const dynamic = 'force-dynamic';

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  // Stop Excel formula injection and quote every cell
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

// CSV of payments with the same filters as the page. Opens in Excel (UTF-8 with BOM).
export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin || !['super_admin', 'moderator'].includes(admin.role)) return new NextResponse('Not found', { status: 404 });
  const f = readPaymentFilters(Object.fromEntries(req.nextUrl.searchParams));
  const { sql, params } = paymentsWhere(f);
  const rows = await q<Record<string, unknown>>(
    `select to_char(p.created_at at time zone 'Asia/Karachi', 'YYYY-MM-DD HH24:MI') as date, p.purpose, p.status::text as status,
            p.amount, p.subtotal, p.discount, pc.code as promo_code, p.method::text as method, p.transaction_id, p.paid_from,
            l.reference, l.title, l.seller_name, l.seller_phone, b.business_name as banner_business, a.full_name as verified_by,
            to_char(p.verified_at at time zone 'Asia/Karachi', 'YYYY-MM-DD HH24:MI') as verified_at, p.reject_reason
       ${PAYMENTS_FROM} ${sql} order by p.created_at desc limit 50000`,
    params,
  );
  const cols = ['date', 'purpose', 'status', 'amount', 'subtotal', 'discount', 'promo_code', 'method', 'transaction_id', 'paid_from', 'reference', 'title',
    'seller_name', 'seller_phone', 'banner_business', 'verified_by', 'verified_at', 'reject_reason'];
  const csv = '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
  await logActivity(admin.id, 'payments.export', 'payments', null, { ...f, rows: rows.length });
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="apna-okara-payments-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
