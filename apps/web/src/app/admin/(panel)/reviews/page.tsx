import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { Notice, PageHeader, Section } from '@/components/admin/ui';
import { REVIEW_SELECT, ReviewItem, type ReviewRow } from '@/components/admin/ReviewItem';

export const metadata = { title: 'Reviews' };

export default async function ReviewsPage(props: { searchParams: Promise<{ tab?: string; saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['moderator']);
  const tab = ['all', 'low', 'hidden'].includes(searchParams.tab ?? '') ? searchParams.tab! : 'all';
  const where = tab === 'low' ? 'where r.rating <= 2 and not r.is_hidden' : tab === 'hidden' ? 'where r.is_hidden' : '';
  const rows = await q<ReviewRow>(`${REVIEW_SELECT} ${where} order by r.created_at desc limit 200`);

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Reviews of service providers and businesses. Hide fake or abusive reviews; hidden reviews stay in records and stop counting in the rating."
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      <nav className="mb-4 flex gap-1">
        {[
          ['all', 'All'],
          ['low', '1–2 stars'],
          ['hidden', 'Hidden'],
        ].map(([k, l]) => (
          <Link key={k} href={`/admin/reviews?tab=${k}`} className={`btn-sm border ${tab === k ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>
            {l}
          </Link>
        ))}
      </nav>
      <Section title={`${rows.length} review(s)`}>
        <ul className="space-y-3">
          {rows.map((r) => (
            <ReviewItem key={r.id} r={r} back={`/admin/reviews?tab=${tab}`} />
          ))}
          {!rows.length && <li className="text-ink-muted">Nothing here.</li>}
        </ul>
      </Section>
    </>
  );
}
