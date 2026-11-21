import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { PageHeader, Section } from '@/components/admin/ui';

export const metadata = { title: 'Activity log' };

type Row = {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  admin_name: string | null;
};

const PAGE = 100;

export default async function ActivityPage(props: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin();
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1);
  const search = (searchParams.q ?? '').trim();
  const rows = await q<Row>(
    `select l.id, l.action, l.entity, l.entity_id, l.details, l.created_at, a.full_name as admin_name
       from activity_log l left join admin_users a on a.id = l.admin_id
      where ($1 = '' or l.action ilike '%' || $1 || '%' or l.entity ilike '%' || $1 || '%' or a.full_name ilike '%' || $1 || '%')
      order by l.id desc
      limit $2 offset $3`,
    [search, PAGE + 1, (page - 1) * PAGE],
  );
  const hasMore = rows.length > PAGE;

  return (
    <>
      <PageHeader title="Activity log" description="Every change made in the admin panel: who, what and when (Pakistan time)." />
      <form className="mb-4 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <input id="q" name="q" defaultValue={search} placeholder="Search action, area or person" className="admin-input max-w-sm" />
        <button type="submit" className="btn-sm border border-line bg-white">
          Search
        </button>
      </form>
      <Section title={`Page ${page}`}>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Item</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, PAGE).map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{new Date(r.created_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}</td>
                  <td>{r.admin_name ?? 'System'}</td>
                  <td className="font-medium">{r.action}</td>
                  <td>
                    {r.entity}
                    {r.entity_id ? ` #${r.entity_id.slice(0, 12)}` : ''}
                  </td>
                  <td className="max-w-xs truncate text-xs text-ink-muted">
                    {Object.keys(r.details ?? {}).length ? JSON.stringify(r.details) : ''}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="text-ink-muted">
                    Nothing yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex gap-2">
          {page > 1 && (
            <Link className="btn-sm border border-line bg-white" href={`/admin/activity?page=${page - 1}&q=${encodeURIComponent(search)}`}>
              Newer
            </Link>
          )}
          {hasMore && (
            <Link className="btn-sm border border-line bg-white" href={`/admin/activity?page=${page + 1}&q=${encodeURIComponent(search)}`}>
              Older
            </Link>
          )}
        </div>
      </Section>
    </>
  );
}
