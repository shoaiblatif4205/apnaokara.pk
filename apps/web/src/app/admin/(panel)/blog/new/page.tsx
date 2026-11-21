import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { Notice, PageHeader } from '@/components/admin/ui';
import { PostForm } from '@/components/admin/PostForm';

export const metadata = { title: 'New post' };

export default async function NewPost(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['blog_writer']);
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/blog" className="text-brand hover:underline">← Blog</Link>
      </p>
      <PageHeader title="New post" />
      <Notice error={searchParams.error} />
      <PostForm />
    </>
  );
}
