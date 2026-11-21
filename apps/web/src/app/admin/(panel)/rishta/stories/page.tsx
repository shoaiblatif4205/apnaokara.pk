import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { Checkbox, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { saveStory } from '../actions';

export const metadata = { title: 'Success stories' };

type Story = { id: number; title_en: string; title_ur: string; body_en: string; body_ur: string; city: string | null; is_published: boolean };

function StoryForm({ s }: { s?: Story }) {
  const k = s ? `s${s.id}` : 'new';
  return (
    <form action={saveStory} className="grid gap-3 md:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Title (English)" htmlFor={`${k}-te`}><input id={`${k}-te`} name="title_en" defaultValue={s?.title_en} className="admin-input" required /></Field>
      <Field label="Title (Urdu)" htmlFor={`${k}-tu`}><input id={`${k}-tu`} name="title_ur" defaultValue={s?.title_ur} className="admin-input-ur" dir="rtl" required /></Field>
      <Field label="Story (English)" htmlFor={`${k}-be`}><textarea id={`${k}-be`} name="body_en" rows={4} defaultValue={s?.body_en} className="admin-input" /></Field>
      <Field label="Story (Urdu)" htmlFor={`${k}-bu`}><textarea id={`${k}-bu`} name="body_ur" rows={4} defaultValue={s?.body_ur} className="admin-input-ur" dir="rtl" /></Field>
      <Field label="City (optional)" htmlFor={`${k}-c`}><input id={`${k}-c`} name="city" defaultValue={s?.city ?? ''} className="admin-input" /></Field>
      <div className="flex items-end gap-3">
        <Checkbox id={`${k}-p`} name="is_published" label="Published" defaultChecked={s?.is_published} />
        <SubmitButton className="btn-sm border border-line bg-white">{s ? 'Save' : 'Add story'}</SubmitButton>
      </div>
    </form>
  );
}

export default async function StoriesPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin(['rishta_coordinator']);
  const stories = await q<Story>('select * from rishta_stories order by created_at desc');
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/rishta" className="text-brand hover:underline">← Rishta</Link></p>
      <PageHeader title="Success stories" description="Publish only with written permission of both families. Do not use real names or photos unless they agree." />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      {stories.map((s) => (
        <Section key={s.id} title={s.title_en}>
          <StoryForm s={s} />
        </Section>
      ))}
      <Section title="New story">
        <StoryForm />
      </Section>
    </>
  );
}
