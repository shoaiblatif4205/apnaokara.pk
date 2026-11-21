import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { exportableTables } from '@/lib/admin/exportTables';
import { KEEP_BACKUPS } from '@/lib/backup';
import { Badge, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { backupNow } from './actions';

export const metadata = { title: 'Backups & export' };

const GROUPS: [string, RegExp][] = [
  ['Ads and sellers', /^(listings|listing_|payments|promo|reviews|reports|blocked|referral)/],
  ['Banners', /^banner/],
  ['Rishta (private: handle with care)', /^rishta/],
  ['Site, pages and blog', /^(pages|blog|authors|categories|category_|cities|districts|localities|homepage|site_settings|redirects|contact_messages|pricing|addons)/],
  ['App and admin', /^(push|admin|activity)/],
];

export default async function BackupsPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin([]);
  const [backups, tables] = await Promise.all([
    q<{ id: number; file_name: string; size_bytes: number | null; status: string; error: string | null; created_at: Date; by: string | null }>(
      `select b.id, b.file_name, b.size_bytes, b.status, b.error, b.created_at, a.full_name as by
         from backups b left join admin_users a on a.id = b.started_by order by b.created_at desc limit 30`,
    ),
    exportableTables(),
  ]);
  const grouped = GROUPS.map(([name, re]) => [name, tables.filter((t) => re.test(t.name))] as const);
  const other = tables.filter((t) => !GROUPS.some(([, re]) => re.test(t.name)));

  return (
    <>
      <PageHeader
        title="Backups & export"
        description={`A full database backup is made automatically every day after 2 am and the last ${KEEP_BACKUPS} are kept. Photos are kept separately in file storage.`}
        actions={
          <form action={backupNow}>
            <SubmitButton>Back up now</SubmitButton>
          </form>
        }
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      <Section title="Backups">
        {backups.length === 0 ? (
          <p className="text-sm text-ink-muted">No backups yet. The first automatic one runs within the hour, or click “Back up now”.</p>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Date</th><th>Made by</th><th>Size</th><th>Status</th><th /></tr></thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id}>
                  <td>{b.created_at.toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>{b.by ?? 'Automatic'}</td>
                  <td className="tabular-nums">{b.size_bytes ? `${(b.size_bytes / 1024).toFixed(0)} KB` : '—'}</td>
                  <td>{b.status === 'done' ? <Badge tone="green">OK</Badge> : <Badge tone="red">Failed</Badge>}{b.error && <span className="block text-xs text-red-700">{b.error}</span>}</td>
                  <td>{b.status === 'done' && <a href={`/admin/backups/download/${b.id}`} className="btn-sm border border-line bg-white">Download</a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <details className="mt-4 rounded-lg bg-page p-3 text-sm">
          <summary className="cursor-pointer font-semibold">How to restore a backup</summary>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-ink-muted">
            <li>Download the backup file and keep a copy in a safe place (Google Drive, USB).</li>
            <li>On the computer with the project, run: <code dir="ltr">node scripts/restore-backup.mjs path\to\file.jsonl.gz --yes</code></li>
            <li>This replaces all data in the database with the backup. Ask your developer if you are not sure.</li>
          </ol>
        </details>
      </Section>

      <Section title="Download a table (Excel / CSV)" description="Opens in Excel with Urdu text. Passwords and login codes are never included. Every download is recorded in the Activity log.">
        <div className="grid gap-4 md:grid-cols-2">
          {[...grouped, ['Other', other] as const].filter(([, list]) => list.length).map(([name, list]) => (
            <div key={name} className="rounded-lg border border-line p-3">
              <p className="mb-2 text-sm font-semibold">{name}</p>
              <ul className="flex flex-wrap gap-2">
                {list.map((t) => (
                  <li key={t.name}>
                    <a href={`/admin/export/${t.name}`} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-xs hover:border-brand">
                      {t.name} <span className="text-ink-muted">~{t.rows}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
