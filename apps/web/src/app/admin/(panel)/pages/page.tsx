import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { DEFAULT_PAGES, PAGE_SLUGS } from '@/lib/defaultPages';
import { Badge, Notice, PageHeader, Section } from '@/components/admin/ui';

export const metadata = { title: 'Pages' };

type Row = { slug: string; title_en: string; body_en: string; body_ur: string; status: string; updated_at: Date };

const GROUPS: [string, string[]][] = [
  ['Info pages', ['about', 'contact', 'how-it-works', 'faq', 'pricing', 'safety', 'community', 'download']],
  ['Legal pages', ['terms', 'privacy', 'posting-rules', 'refund-policy', 'disclaimer']],
];

export default async function PagesAdmin(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['blog_writer']);
  const rows = await q<Row>('select slug, title_en, body_en, body_ur, status::text, updated_at from pages');
  const by = new Map(rows.map((r) => [r.slug, r]));

  return (
    <>
      <PageHeader
        title="Pages"
        description="Text for the info and legal pages, in English and Urdu. Until you write your own text, the starting text is shown. Please check the legal pages before launch."
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      {GROUPS.map(([title, slugs]) => (
        <Section key={title} title={title}>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Address</th>
                  <th>Text</th>
                  <th>Shown</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {slugs.filter((s) => (PAGE_SLUGS as readonly string[]).includes(s)).map((slug) => {
                  const r = by.get(slug);
                  const own = !!(r?.body_en.trim() || r?.body_ur.trim());
                  return (
                    <tr key={slug}>
                      <td>
                        <Link href={`/admin/pages/${slug}`} className="font-semibold text-brand hover:underline">
                          {r?.title_en || DEFAULT_PAGES[slug as keyof typeof DEFAULT_PAGES].title.en}
                        </Link>
                      </td>
                      <td>
                        <a href={`/en/${slug}`} target="_blank" rel="noreferrer" className="text-ink-muted hover:underline">
                          /{slug}
                        </a>
                      </td>
                      <td>
                        {own ? (
                          <Badge tone="green">Your text</Badge>
                        ) : (
                          <Badge>Starting text</Badge>
                        )}
                      </td>
                      <td>{r?.status === 'archived' ? <Badge tone="red">Hidden</Badge> : <Badge tone="green">Visible</Badge>}</td>
                      <td className="text-ink-muted">{own && r ? r.updated_at.toLocaleDateString('en-PK') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      ))}
    </>
  );
}
