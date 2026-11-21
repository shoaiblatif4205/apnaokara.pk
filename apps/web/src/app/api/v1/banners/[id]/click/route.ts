import { NextResponse, type NextRequest } from 'next/server';
import { q, q1 } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Counts a banner click, then sends the visitor to the banner's own link.
// Only the link saved on the banner is allowed (no open redirect).
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!/^[0-9a-f-]{36}$/.test(params.id)) return NextResponse.redirect(new URL('/', req.url));
  const b = await q1<{ link_url: string | null }>('select link_url from banners where id = $1', [params.id]);
  if (!b?.link_url) return NextResponse.redirect(new URL('/', req.url));
  await q(
    `insert into banner_stats (banner_id, day, clicks) values ($1, (now() at time zone 'Asia/Karachi')::date, 1)
     on conflict (banner_id, day) do update set clicks = banner_stats.clicks + 1`,
    [params.id],
  );
  return NextResponse.redirect(/^(https?:|tel:)/.test(b.link_url) ? b.link_url : new URL(b.link_url, req.url));
}
