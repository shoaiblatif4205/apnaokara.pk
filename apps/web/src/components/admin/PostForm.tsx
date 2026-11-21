import { q } from '@/lib/db';
import { publicUrl } from '@/lib/storage';
import { toPkInput } from '@/lib/admin/form';
import { Checkbox, Field, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { MarkdownHelp } from '@/components/admin/MarkdownHelp';
import { savePost } from '@/app/admin/(panel)/blog/actions';

export type PostRow = {
  id: string; slug: string; locale: string; title: string; excerpt: string | null; body: string; cover_path: string | null;
  category_id: number | null; author_id: number | null; related_category_id: number | null; faq: { q: string; a: string }[];
  seo_title: string | null; seo_description: string | null; focus_keyword: string | null; noindex: boolean; status: string;
  published_at: Date | null; translation_of: string | null; tags: string | null;
};

/** Create / edit form for a blog post (used by New post and Edit post). */
export async function PostForm({ post }: { post?: PostRow }) {
  const [cats, authors, adCats, others] = await Promise.all([
    q<{ id: number; name_en: string }>('select id, name_en from blog_categories order by sort_order, id'),
    q<{ id: number; name: string }>('select id, name from authors order by id'),
    q<{ id: number; name_en: string; parent: string | null }>(
      `select c.id, c.name_en, p.name_en as parent from categories c left join categories p on p.id = c.parent_id
        where c.is_active order by coalesce(p.sort_order, c.sort_order), c.parent_id nulls first, c.sort_order`,
    ),
    q<{ id: string; title: string; locale: string }>('select id, title, locale from blog_posts where id is distinct from $1 order by created_at desc limit 200', [post?.id ?? null]),
  ]);
  const status = post?.status === 'scheduled' ? 'published' : post?.status ?? 'draft';
  const urdu = post?.locale === 'ur';

  return (
    <form action={savePost}>
      {post && <input type="hidden" name="id" value={post.id} />}
      <Section title="Article">
        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <Field label="Title" htmlFor="title">
            <input id="title" name="title" required minLength={5} maxLength={140} defaultValue={post?.title} className="admin-input" dir="auto" />
          </Field>
          <Field label="Language" htmlFor="locale" hint="One post = one language">
            <select id="locale" name="locale" defaultValue={post?.locale ?? 'ur'} className="admin-input">
              <option value="ur">Urdu</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Address (slug)" htmlFor="slug" hint="English letters only, e.g. how-to-buy-used-bike. Empty = made from the title.">
            <input id="slug" name="slug" defaultValue={post?.slug} pattern="[a-zA-Z0-9\- ]*" className="admin-input" dir="ltr" />
          </Field>
          <div />
          <div className="md:col-span-2">
            <Field label="Short summary / quick answer" htmlFor="excerpt" hint="40–60 words that directly answer the main question. Shown in a Quick answer box at the top, on blog cards and in Google.">
              <textarea id="excerpt" name="excerpt" rows={2} maxLength={300} defaultValue={post?.excerpt ?? ''} className="admin-input" dir="auto" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Text" htmlFor="body" hint="Use ## for headings. Start with a short, direct answer to the main question.">
              <textarea id="body" name="body" rows={24} defaultValue={post?.body} className={urdu ? 'admin-input-ur' : 'admin-input font-mono text-[13px]'} dir="auto" />
            </Field>
            <MarkdownHelp />
          </div>
        </div>
      </Section>

      <Section title="Cover picture">
        <div className="flex flex-wrap items-start gap-4">
          {post?.cover_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={publicUrl('blog', post.cover_path)} alt="" className="h-28 w-48 rounded-lg object-cover" />
          )}
          <div className="space-y-2">
            <Field label={post?.cover_path ? 'Change picture' : 'Picture'} htmlFor="cover" hint="Wide picture, at least 1200 × 675. JPG, PNG or WebP.">
              <input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="admin-input" />
            </Field>
            {post?.cover_path && <Checkbox name="remove_cover" label="Remove picture" />}
          </div>
        </div>
      </Section>

      <Section title="Category, tags and links">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Blog category" htmlFor="category_id">
            <select id="category_id" name="category_id" defaultValue={post?.category_id ?? ''} className="admin-input">
              <option value="">— None —</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name_en}</option>
              ))}
            </select>
          </Field>
          <Field label="Author" htmlFor="author_id">
            <select id="author_id" name="author_id" defaultValue={post?.author_id ?? authors[0]?.id ?? ''} className="admin-input">
              <option value="">— None —</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Tags" htmlFor="tags" hint="Separate with commas, e.g. bikes, okara, safety">
            <input id="tags" name="tags" defaultValue={post?.tags ?? ''} className="admin-input" dir="auto" />
          </Field>
          <Field label="Show ads from" htmlFor="related_category_id" hint="Ads from this category are shown under the post.">
            <select id="related_category_id" name="related_category_id" defaultValue={post?.related_category_id ?? ''} className="admin-input">
              <option value="">— No ads —</option>
              {adCats.map((c) => (
                <option key={c.id} value={c.id}>{c.parent ? `${c.parent} › ${c.name_en}` : c.name_en}</option>
              ))}
            </select>
          </Field>
          <Field label="Same post in the other language" htmlFor="translation_of" hint="Links the Urdu and English versions together.">
            <select id="translation_of" name="translation_of" defaultValue={post?.translation_of ?? ''} className="admin-input">
              <option value="">— None —</option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>{o.locale === 'ur' ? '[UR]' : '[EN]'} {o.title}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Questions and answers (optional)" description="One per line: Question | Answer. Shown at the end of the post and sent to Google as FAQ data.">
        <textarea
          id="faq"
          name="faq"
          aria-label="Questions and answers"
          rows={5}
          defaultValue={(post?.faq ?? []).map((f) => `${f.q} | ${f.a}`).join('\n')}
          className={urdu ? 'admin-input-ur' : 'admin-input'}
          dir="auto"
          placeholder="How much does an ad cost? | Ads start from Rs 150 for 7 days."
        />
      </Section>

      <Section title="Search engines (optional)" description="Leave empty to use the title and summary.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="SEO title" htmlFor="seo_title" hint="About 50–60 letters">
            <input id="seo_title" name="seo_title" maxLength={70} defaultValue={post?.seo_title ?? ''} className="admin-input" dir="auto" />
          </Field>
          <Field label="Main keyword" htmlFor="focus_keyword" hint="e.g. used bikes in Okara">
            <input id="focus_keyword" name="focus_keyword" defaultValue={post?.focus_keyword ?? ''} className="admin-input" dir="auto" />
          </Field>
          <div className="md:col-span-2">
            <Field label="SEO description" htmlFor="seo_description" hint="About 140–160 letters">
              <textarea id="seo_description" name="seo_description" rows={2} maxLength={200} defaultValue={post?.seo_description ?? ''} className="admin-input" dir="auto" />
            </Field>
          </div>
          <Checkbox name="noindex" label="Hide from Google (noindex)" defaultChecked={post?.noindex} />
        </div>
      </Section>

      <Section title="Publish">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Status" htmlFor="status">
            <select id="status" name="status" defaultValue={status} className="admin-input">
              <option value="draft">Draft (not shown)</option>
              <option value="published">Published</option>
              <option value="archived">Archived (not shown)</option>
            </select>
          </Field>
          <Field label="Publish date (Pakistan time)" htmlFor="published_at" hint="Empty = now. A future date schedules the post.">
            <input id="published_at" name="published_at" type="datetime-local" defaultValue={toPkInput(post?.published_at?.toISOString())} className="admin-input" />
          </Field>
          <SubmitButton>{post ? 'Save post' : 'Create post'}</SubmitButton>
        </div>
      </Section>
    </form>
  );
}
