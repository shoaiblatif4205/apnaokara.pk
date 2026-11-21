import { NextResponse } from 'next/server';
import { countView, getAdByReference, similarAds } from '@/lib/public';

export const dynamic = 'force-dynamic';

// One ad for the app's ad screen (live, expired or sold; never pending/rejected).
export async function GET(_req: Request, props: { params: Promise<{ ref: string }> }) {
  const params = await props.params;
  if (!/^AO-\d{4,10}$/i.test(params.ref)) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  const ad = await getAdByReference(params.ref);
  if (!ad) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  if (ad.status === 'live') await countView(ad.id).catch(() => {});
  const similar = await similarAds(ad, 6);
  const { fieldDefs, ...rest } = ad;
  const fields = Object.entries(ad.fields)
    .map(([k, v]) => {
      const d = fieldDefs.find((f) => f.key === k);
      if (!d) return null;
      const opt = d.type === 'select' ? d.options?.find((o) => o.en === v) : undefined;
      return {
        label: { en: d.label_en, ur: d.label_ur },
        value: typeof v === 'boolean' ? { en: v ? 'Yes' : 'No', ur: v ? 'ہاں' : 'نہیں' } : { en: String(v), ur: opt?.ur ?? String(v) },
        unit: d.unit_en ? { en: d.unit_en, ur: d.unit_ur ?? d.unit_en } : null,
      };
    })
    .filter(Boolean);
  return NextResponse.json({ ad: { ...rest, fieldList: fields }, similar }, { headers: { 'Cache-Control': 'no-store' } });
}
