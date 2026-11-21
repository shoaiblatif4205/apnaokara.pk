import { NextResponse } from 'next/server';
import { availableMethods, loadMeta } from '@/lib/meta';
import { runExpiryIfDue } from '@/lib/expiry';

export const dynamic = 'force-dynamic';

// Categories, fields, cities, prices, free mode and payment accounts.
// Used by the Post Ad form on the website and in the app.
export async function GET() {
  void runExpiryIfDue();
  const meta = await loadMeta();
  return NextResponse.json(
    { ...meta, paymentMethods: availableMethods(meta.paymentAccounts) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
