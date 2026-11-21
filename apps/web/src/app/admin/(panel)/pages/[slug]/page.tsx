import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { DEFAULT_PAGES, PAGE_SLUGS, type PageSlug } from '@/lib/defaultPages';
import { Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { MarkdownHelp } from '@/components/admin/MarkdownHelp';
import { savePage } from '../actions';

export const metadata = { title: 'Edit page' };

type Row = { title_en: string; title_ur: string; body_en: string; body_ur: string; seo_title: string | null; seo_description: string | null; status: string };

const NOTES: Partial<Record<PageSlug, string>> = {
  about: 'Write your own story here: who runs Apna Okara, since when, and why.',
  contact: 'Phone, WhatsApp, email and address come from Site settings. The contact form is added below this text.',
  faq: 'Each question starts with "### " on its own line, with the answer under it. Questions also go to Google as FAQ data.',
  pricing: 'Price tables come from the Pricing page and are added under this text automatically.',
  community: 'WhatsApp and Facebook buttons come from Site settings (social links).',
  download: 'Store buttons come from Site settings (app links). They show "coming soon" until links are added.',
};

export default async function EditPage(props: { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  await requireAdmin(['blog_writer']);
  const slug = params.slug as PageSlug;
  if (!PAGE_SLUGS.includes(slug)) notFound();
  const def = DEFAULT_PAGES[slug];
  const r = await q1<Row>('select title_en, title_ur, body_en, body_ur, seo_title, seo_description, status::text from pages where slug = $1', [slug]);
  const bodyEn = r?.body_en.trim() || def.body.en;
  const bodyUr = r?.body_ur.trim() || def.body.ur;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/pages" className="text-brand hover:underline">← Pages</Link>
      </p>
      <PageHeader
        title={r?.title_en || def.title.en}
        description={NOTES[slug]}
        actions={
          <span className="flex gap-2">
            <a href={`/en/${slug}`} target="_blank" rel="noreferrer" className="btn-sm border border-line bg-white">View English</a>
            <a href={`/ur/${slug}`} target="_blank" rel="noreferrer" className="btn-sm border border-line bg-white">View Urdu</a>
          </span>
        }
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      {(!r?.body_en.trim() || !r?.body_ur.trim()) && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          The boxes below show the starting text. Change it and save to use your own text.
        </p>
      )}
      <form action={savePage}>
        <input type="hidden" name="slug" value={slug} />
        <Section title="Text">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title (English)" htmlFor="title_en">
              <input id="title_en" name="title_en" defaultValue={r?.title_en || def.title.en} className="admin-input" required />
            </Field>
            <Field label="Title (Urdu)" htmlFor="title_ur">
              <input id="title_ur" name="title_ur" defaultValue={r?.title_ur || def.title.ur} className="admin-input-ur" dir="rtl" required />
            </Field>
            <Field label="Text (English)" htmlFor="body_en">
              <textarea id="body_en" name="body_en" rows={22} defaultValue={bodyEn} className="admin-input font-mono text-[13px]" />
            </Field>
            <Field label="Text (Urdu)" htmlFor="body_ur">
              <textarea id="body_ur" name="body_ur" rows={22} defaultValue={bodyUr} className="admin-input-ur" dir="rtl" />
            </Field>
          </div>
          <MarkdownHelp />
        </Section>
        <Section title="Search engines (optional)" description="Leave empty to use the title and first lines of the text.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="SEO title" htmlFor="seo_title" hint="About 50–60 letters">
              <input id="seo_title" name="seo_title" maxLength={70} defaultValue={r?.seo_title ?? ''} className="admin-input" />
            </Field>
            <Field label="SEO description" htmlFor="seo_description" hint="About 140–160 letters">
              <textarea id="seo_description" name="seo_description" rows={2} maxLength={200} defaultValue={r?.seo_description ?? ''} className="admin-input" />
            </Field>
          </div>
        </Section>
        <Section title="Show on website">
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Page is" htmlFor="status">
              <select id="status" name="status" defaultValue={r?.status === 'archived' ? 'archived' : 'published'} className="admin-input">
                <option value="published">Visible</option>
                <option value="archived">Hidden</option>
              </select>
            </Field>
            <SubmitButton>Save page</SubmitButton>
          </div>
        </Section>
      </form>
    </>
  );
}
