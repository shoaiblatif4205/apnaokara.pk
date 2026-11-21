import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { Badge, Notice, PageHeader } from '@/components/admin/ui';

export const metadata = { title: 'Blog' };

type Row = { id: string; slug: string; title: string; locale: string; status: string; published_at: Date | null; views: number; category: string | null };

const TONE: Record<string, 'green' | 'orange' | 'gray' | 'red'> = { published: 'green', scheduled: 'orange', draft: 'gray', archived: 'red' };

export default async function BlogAdmin(props: { searchParams: Promise<{ status?: string; lang?: string; saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['blog_writer']);
  const where: string[] = [];
  const args: unknown[] = [];
  if (searchParams.status) {
    args.push(searchParams.status);
    where.push(`p.status::text = $${args.length}`);
  }
  if (searchParams.lang === 'en' || searchParams.lang === 'ur') {
    args.push(searchParams.lang);
    where.push(`p.locale = $${args.length}`);
  }
  const rows = await q<Row>(
    `select p.id, p.slug, p.title, p.locale, p.status::text, p.published_at, p.views, c.name_en as category
       from blog_posts p left join blog_categories c on c.id = p.category_id
      ${where.length ? `where ${where.join(' and ')}` : ''}
      order by coalesce(p.published_at, p.created_at) desc limit 200`,
    args,
  );
  const filter = (k: string, v: string | undefined, label: string) => {
    const sp = new URLSearchParams();
    const next = { status: searchParams.status, lang: searchParams.lang, [k]: v };
    Object.entries(next).forEach(([a, b]) => b && sp.set(a, b));
    const active = (searchParams as Record<string, string | undefined>)[k] === v;
    return (
      <Link key={`${k}${v}`} href={`/admin/blog${sp.size ? `?${sp}` : ''}`} className={`rounded-full border px-3 py-1 text-sm ${active ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>
        {label}
      </Link>
    );
  };

  return (
    <>
      <PageHeader
        title="Blog"
        description="Write helpful articles in Urdu or English. Good articles bring visitors from Google and AI answers."
        actions={
          <span className="flex gap-2">
            <Link href="/admin/blog/settings" className="btn-sm border border-line bg-white">Categories and authors</Link>
            <Link href="/admin/blog/new" className="btn-sm bg-brand text-white">New post</Link>
          </span>
        }
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      <div className="mb-4 flex flex-wrap gap-2">
        {filter('status', undefined, 'All')}
        {filter('status', 'published', 'Published')}
        {filter('status', 'scheduled', 'Scheduled')}
        {filter('status', 'draft', 'Drafts')}
        {filter('status', 'archived', 'Archived')}
        <span className="mx-2 text-line">|</span>
        {filter('lang', undefined, 'Both languages')}
        {filter('lang', 'ur', 'Urdu')}
        {filter('lang', 'en', 'English')}
      </div>
      {rows.length ? (
        <div className="card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Language</th>
                <th>Category</th>
                <th>Status</th>
                <th>Publish date</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/blog/${r.id}`} className="font-semibold text-brand hover:underline" dir="auto">
                      {r.title}
                    </Link>
                    <span className="block text-xs text-ink-muted">/blog/{r.slug}</span>
                  </td>
                  <td>{r.locale === 'ur' ? 'Urdu' : 'English'}</td>
                  <td>{r.category ?? '—'}</td>
                  <td>
                    <Badge tone={TONE[r.status] ?? 'gray'}>{r.status}</Badge>
                  </td>
                  <td className="text-ink-muted">{r.published_at ? r.published_at.toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  <td className="tabular-nums">{r.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="card p-6 text-ink-muted">No posts yet. Click “New post” to write the first one.</p>
      )}
    </>
  );
}
