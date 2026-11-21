import { NextResponse, type NextRequest } from 'next/server';
import { UserError } from '@/lib/errors';
import { loadMeta } from '@/lib/meta';
import { normalizePhone } from '@/lib/phone';
import { quoteAd, quoteUpgrade } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

// POST { categoryId, days, featured, boost, promoCode, phone }        -> price for a new ad
// POST { upgrade: true, featured, boost, promoCode, phone }           -> price for Featured/Boost on a live ad
// The server always recalculates on submit; this is only for showing the total.
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const phone = typeof b.phone === 'string' ? normalizePhone(b.phone) : null;
  try {
    if (b.upgrade) {
      return NextResponse.json(await quoteUpgrade({ featured: !!b.featured, boost: !!b.boost, promoCode: String(b.promoCode ?? ''), phone }));
    }
    const meta = await loadMeta();
    const cat = meta.categories.find((c) => c.id === Number(b.categoryId));
    if (!cat) return NextResponse.json({ message: 'Choose a category' }, { status: 400 });
    const quote = await quoteAd({
      model: cat.model,
      categoryId: cat.id,
      categorySlug: cat.slug,
      days: Number(b.days),
      featured: !!b.featured,
      boost: !!b.boost,
      promoCode: String(b.promoCode ?? ''),
      phone,
      freeMode: meta.freeMode,
      pricing: meta.pricing,
    });
    return NextResponse.json(quote);
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    throw e;
  }
}
