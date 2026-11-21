import Link from 'next/link';
import { q } from '@/lib/db';
import { can, requireAdmin } from '@/lib/admin/auth';
import { Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { deleteBlogCategory, saveAuthor, saveBlogCategory } from '../actions';

export const metadata = { title: 'Blog categories and authors' };

type Cat = { id: number; slug: string; name_en: string; name_ur: string; sort_order: number; posts: number };

function CatForm({ c }: { c?: Cat }) {
  const k = c ? `c${c.id}` : 'cnew';
  return (
    <form action={saveBlogCategory} className="grid items-end gap-3 md:grid-cols-[1fr_1fr_1fr_90px_auto]">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Name (English)" htmlFor={`${k}-en`}><input id={`${k}-en`} name="name_en" defaultValue={c?.name_en} className="admin-input" required /></Field>
      <Field label="Name (Urdu)" htmlFor={`${k}-ur`}><input id={`${k}-ur`} name="name_ur" defaultValue={c?.name_ur} className="admin-input-ur" dir="rtl" required /></Field>
      <Field label="Address" htmlFor={`${k}-s`}><input id={`${k}-s`} name="slug" defaultValue={c?.slug} className="admin-input" dir="ltr" placeholder="made from name" /></Field>
      <Field label="Order" htmlFor={`${k}-o`}><input id={`${k}-o`} name="sort_order" type="number" defaultValue={c?.sort_order ?? 100} className="admin-input" /></Field>
      <SubmitButton className="btn-sm border border-line bg-white">{c ? 'Save' : 'Add'}</SubmitButton>
    </form>
  );
}

export default async function BlogSettings(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const admin = await requireAdmin(['blog_writer']);
  const [cats, authors] = await Promise.all([
    q<Cat>(`select c.*, (select count(*)::int from blog_posts p where p.category_id = c.id) as posts from blog_categories c order by c.sort_order, c.id`),
    q<{ id: number; name: string; bio: string | null }>('select id, name, bio from authors order by id'),
  ]);
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/blog" className="text-brand hover:underline">← Blog</Link>
      </p>
      <PageHeader title="Blog categories and authors" />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      <Section title="Categories">
        <div className="space-y-3">
          {cats.map((c) => (
            <div key={c.id} className="rounded-lg border border-line p-3">
              <CatForm c={c} />
              <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
                <span>{c.posts} post(s) · /blog/category/{c.slug}</span>
                {can(admin, []) && c.posts === 0 && (
                  <form action={deleteBlogCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton className="btn-danger" confirm="Delete this category?">Delete</SubmitButton>
                  </form>
                )}
              </div>
            </div>
          ))}
          <div className="rounded-lg bg-page p-3">
            <p className="mb-2 text-sm font-semibold">New category</p>
            <CatForm />
          </div>
        </div>
      </Section>
      <Section title="Authors" description="Shown on posts as “By …”. A short bio helps readers (and Google) trust the article.">
        <div className="space-y-3">
          {[...authors, undefined].map((a) => (
            <form key={a?.id ?? 'new'} action={saveAuthor} className="grid items-end gap-3 rounded-lg border border-line p-3 md:grid-cols-[1fr_2fr_auto]">
              {a && <input type="hidden" name="id" value={a.id} />}
              <Field label={a ? 'Name' : 'New author name'} htmlFor={`a${a?.id ?? 'n'}-n`}><input id={`a${a?.id ?? 'n'}-n`} name="name" defaultValue={a?.name} className="admin-input" required /></Field>
              <Field label="Short bio" htmlFor={`a${a?.id ?? 'n'}-b`}><input id={`a${a?.id ?? 'n'}-b`} name="bio" defaultValue={a?.bio ?? ''} className="admin-input" dir="auto" /></Field>
              <SubmitButton className="btn-sm border border-line bg-white">{a ? 'Save' : 'Add'}</SubmitButton>
            </form>
          ))}
        </div>
      </Section>
    </>
  );
}
