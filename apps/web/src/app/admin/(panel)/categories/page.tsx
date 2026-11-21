import Link from 'next/link';
import { models } from '@apna-okara/shared';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { Badge, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ICON_OPTIONS } from './icons';
import { createCategory } from './actions';

export const metadata = { title: 'Categories' };

type Row = {
  id: number;
  model: string;
  slug: string;
  name_en: string;
  name_ur: string;
  icon: string | null;
  show_on_home: boolean;
  sort_order: number;
  is_active: boolean;
  subs: string;
  fields: string;
};

export default async function CategoriesPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin();
  const rows = await q<Row>(`
    select c.id, c.model, c.slug, c.name_en, c.name_ur, c.icon, c.show_on_home, c.sort_order, c.is_active,
           (select count(*) from categories s where s.parent_id = c.id) as subs,
           (select count(*) from category_fields f where f.category_id = c.id) as fields
      from categories c
     where c.parent_id is null
     order by c.sort_order, c.id`);

  return (
    <>
      <PageHeader
        title="Categories"
        description="All categories of the 6 models. Click a category to edit its names, sub-categories and the extra fields on its ad form. Turning a category off hides it from the site; nothing is deleted."
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      {models.map((m) => {
        const list = rows.filter((r) => r.model === m.key);
        return (
          <Section key={m.key} title={`${m.name.en} · ${m.name.ur}`}>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Urdu</th>
                    <th>Sub-categories</th>
                    <th>Form fields</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className="flex items-center gap-2 font-medium">
                          {c.icon && <CategoryIcon icon={c.icon as never} size={18} className="text-brand" />}
                          {c.name_en}
                        </span>
                      </td>
                      <td className="font-urdu leading-[2]" dir="rtl">
                        {c.name_ur}
                      </td>
                      <td>{c.subs}</td>
                      <td>{c.fields}</td>
                      <td className="space-x-1">
                        {c.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Off</Badge>}
                        {c.show_on_home && <Badge tone="orange">Home</Badge>}
                      </td>
                      <td className="text-end">
                        <Link href={`/admin/categories/${c.id}`} className="font-semibold text-brand hover:underline">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!list.length && (
                    <tr>
                      <td colSpan={6} className="text-ink-muted">
                        No categories yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        );
      })}

      <Section title="Add a category" description="The web address (slug) is made from the English name.">
        <form action={createCategory} className="grid gap-4 md:grid-cols-4">
          <Field label="Model" htmlFor="model">
            <select id="model" name="model" className="admin-input" required>
              {models.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.name.en}
                </option>
              ))}
            </select>
          </Field>
          <Field label="English name" htmlFor="name_en">
            <input id="name_en" name="name_en" className="admin-input" required />
          </Field>
          <Field label="Urdu name" htmlFor="name_ur">
            <input id="name_ur" name="name_ur" className="admin-input-ur" dir="rtl" required />
          </Field>
          <Field label="Icon" htmlFor="icon">
            <select id="icon" name="icon" className="admin-input">
              {ICON_OPTIONS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-4">
            <SubmitButton>Add category</SubmitButton>
          </div>
        </form>
      </Section>
    </>
  );
}
