import Link from 'next/link';
import { whatsappPostText } from '@apna-okara/shared';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { LIVE } from '@/lib/public';
import { Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { CopyButton } from '@/components/admin/CopyButton';
import { boostDone } from '../listings/actions';
import { SITE_URL } from '@/lib/seo';

export const metadata = { title: 'WhatsApp Boost' };

type Row = { id: string; reference: string; slug: string; title: string; price: number | null; price_type: string; city: string; cover: string | null };

export default async function BoostQueue(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  const rows = await q<Row>(
    `select l.id, l.reference, l.slug, l.title, l.price, l.price_type, ci.name_en as city,
            (select storage_path from listing_images i where i.listing_id = l.id and i.is_cover limit 1) as cover
       from listings l join cities ci on ci.id = l.city_id
      where l.boost_requested and l.boost_done_at is null and ${LIVE}
        and not exists (select 1 from payments p where p.listing_id = l.id and p.status = 'pending' and p.items @> '[{"key":"whatsapp_boost"}]')
      order by l.approved_at`,
  );
  const site = SITE_URL;
  return (
    <>
      <PageHeader title="WhatsApp Boost" description="Paid ads waiting to be posted in the WhatsApp group and Facebook page. Copy the post, share it, then press Done." />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      <Section title={`${rows.length} waiting`}>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3 text-sm">
              {r.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/listing-images/${r.cover}`} alt="" className="h-14 w-14 rounded object-cover" />
              )}
              <Link href={`/admin/listings/${r.id}`} className="flex-1 font-semibold text-brand hover:underline">
                {r.reference} · {r.title}
              </Link>
              <CopyButton
                label="Copy post"
                text={whatsappPostText({ title: r.title, price: r.price, priceType: r.price_type, city: r.city, reference: r.reference, url: `${site}/en/ad/${r.slug}-${r.reference}` })}
              />
              <form action={boostDone}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="back" value="/admin/boost?saved=1" />
                <SubmitButton className="btn-sm bg-brand text-white hover:bg-brand-dark">Done (posted)</SubmitButton>
              </form>
            </li>
          ))}
          {!rows.length && <li className="text-ink-muted">Nothing waiting.</li>}
        </ul>
      </Section>
    </>
  );
}
