import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q1 } from '@/lib/db';
import { can, requireAdmin } from '@/lib/admin/auth';
import { Badge, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { PostForm, type PostRow } from '@/components/admin/PostForm';
import { deletePost } from '../actions';

export const metadata = { title: 'Edit post' };

export default async function EditPost(props: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const admin = await requireAdmin(['blog_writer']);
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const post = await q1<PostRow & { views: number; live: boolean }>(
    `select p.*, p.status::text as status,
            (select string_agg(t.name, ', ' order by t.name) from blog_post_tags pt join blog_tags t on t.id = pt.tag_id where pt.post_id = p.id) as tags,
            (p.status in ('published', 'scheduled') and p.published_at <= now()) as live
       from blog_posts p where p.id = $1`,
    [params.id],
  );
  if (!post) notFound();
  const url = `/${post.locale}/blog/${post.slug}`;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/blog" className="text-brand hover:underline">← Blog</Link>
      </p>
      <PageHeader
        title={post.title}
        description={`${post.views} views`}
        actions={
          <span className="flex items-center gap-2">
            <Badge tone={post.live ? 'green' : post.status === 'scheduled' ? 'orange' : 'gray'}>{post.live ? 'Live' : post.status}</Badge>
            {post.live && (
              <a href={url} target="_blank" rel="noreferrer" className="btn-sm border border-line bg-white">
                View post
              </a>
            )}
          </span>
        }
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      <PostForm post={post} />
      {can(admin, []) && (
        <Section title="Delete post" description="This cannot be undone. To hide a post but keep it, set the status to Archived instead.">
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <SubmitButton className="btn-danger" confirm="Delete this post for ever? This cannot be undone.">
              Delete post
            </SubmitButton>
          </form>
        </Section>
      )}
    </>
  );
}
