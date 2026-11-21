import Link from 'next/link';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { Checkbox, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { createCity, updateCity } from './actions';

export const metadata = { title: 'Locations' };

type District = { id: number; name_en: string; name_ur: string };
type City = {
  id: number;
  district_id: number;
  slug: string;
  name_en: string;
  name_ur: string;
  sort_order: number;
  is_active: boolean;
  localities: string;
};

export default async function LocationsPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin();
  const districts = await q<District>('select id, name_en, name_ur from districts order by sort_order');
  const cities = await q<City>(`
    select c.*, (select count(*) from localities l where l.city_id = c.id and l.slug <> 'other') as localities
      from cities c order by c.sort_order, c.id`);

  return (
    <>
      <PageHeader
        title="Locations"
        description="Cities and mohallas people can choose. Only Okara, Sahiwal and Pakpattan districts are allowed. Turning a city off hides it; old ads keep it."
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      {districts.map((d) => (
        <Section key={d.id} title={`${d.name_en} District · ${d.name_ur}`}>
          <div className="space-y-2">
            {cities
              .filter((c) => c.district_id === d.id)
              .map((c) => (
                <form key={c.id} action={updateCity} className="grid items-end gap-2 rounded-lg border border-line p-3 md:grid-cols-[1fr_1fr_80px_auto_auto_auto]">
                  <input type="hidden" name="id" value={c.id} />
                  <Field label="English" htmlFor={`c${c.id}-en`}>
                    <input id={`c${c.id}-en`} name="name_en" defaultValue={c.name_en} className="admin-input" required />
                  </Field>
                  <Field label="Urdu" htmlFor={`c${c.id}-ur`}>
                    <input id={`c${c.id}-ur`} name="name_ur" defaultValue={c.name_ur} className="admin-input-ur" dir="rtl" required />
                  </Field>
                  <Field label="Order" htmlFor={`c${c.id}-o`}>
                    <input id={`c${c.id}-o`} name="sort_order" type="number" defaultValue={c.sort_order} className="admin-input" />
                  </Field>
                  <Checkbox id={`c${c.id}-a`} name="is_active" label="Active" defaultChecked={c.is_active} />
                  <SubmitButton className="btn-sm border border-line bg-white hover:border-brand">Save</SubmitButton>
                  <Link href={`/admin/locations/${c.id}`} className="btn-sm text-brand hover:underline">
                    Mohallas ({c.localities})
                  </Link>
                </form>
              ))}
          </div>
        </Section>
      ))}

      <Section title="Add a city or town">
        <form action={createCity} className="grid items-end gap-3 md:grid-cols-[180px_1fr_1fr_auto]">
          <Field label="District" htmlFor="district_id">
            <select id="district_id" name="district_id" className="admin-input" required>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name_en}
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
          <SubmitButton>Add city</SubmitButton>
        </form>
      </Section>
    </>
  );
}
