import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { Checkbox, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { createLocality, updateLocality } from '../actions';

export const metadata = { title: 'Mohallas' };

type Loc = { id: number; slug: string; name_en: string; name_ur: string; sort_order: number; is_active: boolean };

export default async function CityLocalities(props: {
  params: Promise<{ cityId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  await requireAdmin();
  const cityId = Number.parseInt(params.cityId, 10);
  if (!Number.isFinite(cityId)) notFound();
  const city = await q1<{ id: number; name_en: string; name_ur: string }>('select id, name_en, name_ur from cities where id = $1', [cityId]);
  if (!city) notFound();
  const locs = await q<Loc>('select id, slug, name_en, name_ur, sort_order, is_active from localities where city_id = $1 order by sort_order, id', [cityId]);

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/locations" className="text-brand hover:underline">
          ← All locations
        </Link>
      </p>
      <PageHeader title={`Mohallas in ${city.name_en}`} description="“Other area” is always kept last so people can still choose when their mohalla is not listed." />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      <Section title={`${locs.length} mohallas`}>
        <div className="space-y-2">
          {locs.map((l) => (
            <form key={l.id} action={updateLocality} className="grid items-end gap-2 rounded-lg border border-line p-3 md:grid-cols-[1fr_1fr_80px_auto_auto]">
              <input type="hidden" name="id" value={l.id} />
              <input type="hidden" name="city_id" value={city.id} />
              <Field label="English" htmlFor={`l${l.id}-en`}>
                <input id={`l${l.id}-en`} name="name_en" defaultValue={l.name_en} className="admin-input" required />
              </Field>
              <Field label="Urdu" htmlFor={`l${l.id}-ur`}>
                <input id={`l${l.id}-ur`} name="name_ur" defaultValue={l.name_ur} className="admin-input-ur" dir="rtl" required />
              </Field>
              <Field label="Order" htmlFor={`l${l.id}-o`}>
                <input id={`l${l.id}-o`} name="sort_order" type="number" defaultValue={l.sort_order} className="admin-input" />
              </Field>
              <Checkbox id={`l${l.id}-a`} name="is_active" label="Active" defaultChecked={l.is_active} />
              <SubmitButton className="btn-sm border border-line bg-white hover:border-brand">Save</SubmitButton>
            </form>
          ))}
        </div>
      </Section>

      <Section title="Add a mohalla">
        <form action={createLocality} className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="city_id" value={city.id} />
          <Field label="English name" htmlFor="name_en">
            <input id="name_en" name="name_en" className="admin-input" required />
          </Field>
          <Field label="Urdu name" htmlFor="name_ur">
            <input id="name_ur" name="name_ur" className="admin-input-ur" dir="rtl" required />
          </Field>
          <SubmitButton>Add mohalla</SubmitButton>
        </form>
      </Section>
    </>
  );
}
