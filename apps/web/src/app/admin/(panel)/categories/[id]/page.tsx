import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { optionsToText } from '@/lib/admin/form';
import { Badge, Checkbox, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { ICON_OPTIONS } from '../icons';
import { createField, createSubcategory, deleteField, updateCategory, updateField, updateSubcategory } from '../actions';

export const metadata = { title: 'Edit category' };

type Cat = {
  id: number;
  model: string;
  slug: string;
  name_en: string;
  name_ur: string;
  icon: string | null;
  show_on_home: boolean;
  sort_order: number;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
};
type Sub = { id: number; slug: string; name_en: string; name_ur: string; sort_order: number; is_active: boolean };
type FieldRow = {
  id: number;
  key: string;
  label_en: string;
  label_ur: string;
  type: string;
  options: { en: string; ur: string }[] | null;
  unit_en: string | null;
  unit_ur: string | null;
  is_required: boolean;
  sort_order: number;
};

const TYPES = [
  ['text', 'Text'],
  ['number', 'Number'],
  ['select', 'Choose from list'],
  ['boolean', 'Yes / No'],
  ['year', 'Year'],
];

function FieldInputs({ f, prefix }: { f?: FieldRow; prefix: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Field label="English label" htmlFor={`${prefix}-le`}>
        <input id={`${prefix}-le`} name="label_en" defaultValue={f?.label_en} className="admin-input" required />
      </Field>
      <Field label="Urdu label" htmlFor={`${prefix}-lu`}>
        <input id={`${prefix}-lu`} name="label_ur" defaultValue={f?.label_ur} className="admin-input-ur" dir="rtl" required />
      </Field>
      <Field label="Type" htmlFor={`${prefix}-t`}>
        <select id={`${prefix}-t`} name="type" defaultValue={f?.type ?? 'text'} className="admin-input">
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Order" htmlFor={`${prefix}-s`}>
        <input id={`${prefix}-s`} name="sort_order" type="number" defaultValue={f?.sort_order ?? 0} className="admin-input" />
      </Field>
      <Field label="Unit (English)" htmlFor={`${prefix}-ue`} hint="e.g. km, marla, kg">
        <input id={`${prefix}-ue`} name="unit_en" defaultValue={f?.unit_en ?? ''} className="admin-input" />
      </Field>
      <Field label="Unit (Urdu)" htmlFor={`${prefix}-uu`}>
        <input id={`${prefix}-uu`} name="unit_ur" defaultValue={f?.unit_ur ?? ''} className="admin-input-ur" dir="rtl" />
      </Field>
      <div className="md:col-span-2">
        <Field label="Options (only for 'Choose from list')" htmlFor={`${prefix}-o`} hint="One per line: English | Urdu">
          <textarea id={`${prefix}-o`} name="options" rows={3} defaultValue={optionsToText(f?.options ?? null)} className="admin-input font-sans" />
        </Field>
      </div>
      <div className="md:col-span-4">
        <Checkbox id={`${prefix}-r`} name="is_required" label="Required" defaultChecked={f?.is_required} />
      </div>
    </div>
  );
}

export default async function EditCategory(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  await requireAdmin();
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id)) notFound();
  const cat = await q1<Cat>('select * from categories where id = $1 and parent_id is null', [id]);
  if (!cat) notFound();
  const subs = await q<Sub>('select id, slug, name_en, name_ur, sort_order, is_active from categories where parent_id = $1 order by sort_order, id', [id]);
  const fields = await q<FieldRow>('select * from category_fields where category_id = $1 order by sort_order, id', [id]);

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/categories" className="text-brand hover:underline">
          ← All categories
        </Link>
      </p>
      <PageHeader title={cat.name_en} description={`Web address: /${cat.slug} · Model: ${cat.model}`} />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      <Section title="Category details">
        <form action={updateCategory} className="grid gap-4 md:grid-cols-3">
          <input type="hidden" name="id" value={cat.id} />
          <Field label="English name" htmlFor="name_en">
            <input id="name_en" name="name_en" defaultValue={cat.name_en} className="admin-input" required />
          </Field>
          <Field label="Urdu name" htmlFor="name_ur">
            <input id="name_ur" name="name_ur" defaultValue={cat.name_ur} className="admin-input-ur" dir="rtl" required />
          </Field>
          <Field label="Icon" htmlFor="icon">
            <select id="icon" name="icon" defaultValue={cat.icon ?? 'other'} className="admin-input">
              {ICON_OPTIONS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Order" htmlFor="sort_order" hint="Smaller number shows first">
            <input id="sort_order" name="sort_order" type="number" defaultValue={cat.sort_order} className="admin-input" />
          </Field>
          <Field label="SEO title" htmlFor="seo_title" hint="Leave empty to use the automatic title">
            <input id="seo_title" name="seo_title" defaultValue={cat.seo_title ?? ''} className="admin-input" />
          </Field>
          <Field label="SEO description" htmlFor="seo_description">
            <input id="seo_description" name="seo_description" defaultValue={cat.seo_description ?? ''} className="admin-input" />
          </Field>
          <div className="flex flex-wrap gap-6 md:col-span-3">
            <Checkbox name="is_active" label="Active (shown on site)" defaultChecked={cat.is_active} />
            <Checkbox name="show_on_home" label="Show on home page" defaultChecked={cat.show_on_home} />
          </div>
          <div className="md:col-span-3">
            <SubmitButton>Save category</SubmitButton>
          </div>
        </form>
      </Section>

      <Section title={`Sub-categories (${subs.length})`} description="Untick Active to hide a sub-category. Old ads keep their sub-category.">
        <div className="space-y-2">
          {subs.map((s) => (
            <form key={s.id} action={updateSubcategory} className="grid items-end gap-2 rounded-lg border border-line p-3 md:grid-cols-[1fr_1fr_90px_auto_auto]">
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="parent_id" value={cat.id} />
              <Field label="English" htmlFor={`s${s.id}-en`}>
                <input id={`s${s.id}-en`} name="name_en" defaultValue={s.name_en} className="admin-input" required />
              </Field>
              <Field label="Urdu" htmlFor={`s${s.id}-ur`}>
                <input id={`s${s.id}-ur`} name="name_ur" defaultValue={s.name_ur} className="admin-input-ur" dir="rtl" required />
              </Field>
              <Field label="Order" htmlFor={`s${s.id}-o`}>
                <input id={`s${s.id}-o`} name="sort_order" type="number" defaultValue={s.sort_order} className="admin-input" />
              </Field>
              <Checkbox id={`s${s.id}-a`} name="is_active" label="Active" defaultChecked={s.is_active} />
              <SubmitButton className="btn-sm border border-line bg-white hover:border-brand">Save</SubmitButton>
            </form>
          ))}
        </div>
        <form action={createSubcategory} className="mt-4 grid items-end gap-2 rounded-lg bg-page p-3 md:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="parent_id" value={cat.id} />
          <Field label="New sub-category (English)" htmlFor="new-sub-en">
            <input id="new-sub-en" name="name_en" className="admin-input" required />
          </Field>
          <Field label="Urdu" htmlFor="new-sub-ur">
            <input id="new-sub-ur" name="name_ur" className="admin-input-ur" dir="rtl" required />
          </Field>
          <SubmitButton>Add sub-category</SubmitButton>
        </form>
      </Section>

      <Section
        title={`Ad form fields (${fields.length})`}
        description="Extra questions on the Post Ad form for this category, e.g. brand, year, marla. Removing a field keeps the values already saved in old ads."
      >
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.id} className="rounded-lg border border-line p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{f.label_en}</span>
                <Badge>key: {f.key}</Badge>
                {f.is_required && <Badge tone="orange">Required</Badge>}
              </div>
              <form action={updateField}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="category_id" value={cat.id} />
                <FieldInputs f={f} prefix={`f${f.id}`} />
                <div className="mt-3 flex gap-2">
                  <SubmitButton className="btn-sm border border-line bg-white hover:border-brand">Save field</SubmitButton>
                </div>
              </form>
              <form action={deleteField} className="mt-2">
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="category_id" value={cat.id} />
                <SubmitButton className="btn-danger" confirm={`Remove the field "${f.label_en}" from the ad form?`} pendingText="Removing…">
                  Remove field
                </SubmitButton>
              </form>
            </div>
          ))}
        </div>
        <form action={createField} className="mt-4 rounded-lg bg-page p-3">
          <input type="hidden" name="category_id" value={cat.id} />
          <p className="mb-3 text-sm font-semibold">Add a field</p>
          <FieldInputs prefix="new" />
          <div className="mt-3">
            <SubmitButton>Add field</SubmitButton>
          </div>
        </form>
      </Section>
    </>
  );
}
