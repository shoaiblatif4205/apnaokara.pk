import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { toPkInput } from '@/lib/admin/form';
import { Badge, Checkbox, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { savePromo } from './actions';

export const metadata = { title: 'Promo codes' };

type Promo = {
  id: number; code: string; description: string | null; discount_percent: number | null; discount_amount: number | null; max_uses: number | null;
  max_uses_per_phone: number | null; used_count: number; valid_from: string | null; valid_to: string | null; is_active: boolean; purposes: string[] | null;
};

const PURPOSES: [string, string][] = [
  ['listing', 'New ads'],
  ['featured', 'Featured upgrade'],
  ['whatsapp_boost', 'WhatsApp Boost'],
  ['banner', 'Banners'],
];

function PromoForm({ p }: { p?: Promo }) {
  const k = p ? `p${p.id}` : 'new';
  return (
    <form action={savePromo} className="grid gap-3 md:grid-cols-4">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field label="Code" htmlFor={`${k}-code`}>
        <input id={`${k}-code`} name="code" defaultValue={p?.code} className="admin-input uppercase" required />
      </Field>
      <Field label="Discount %" htmlFor={`${k}-pc`}>
        <input id={`${k}-pc`} name="discount_percent" type="number" min={0} max={100} defaultValue={p?.discount_percent ?? ''} className="admin-input" />
      </Field>
      <Field label="Or discount Rs" htmlFor={`${k}-am`}>
        <input id={`${k}-am`} name="discount_amount" type="number" min={0} defaultValue={p?.discount_amount ?? ''} className="admin-input" />
      </Field>
      <Field label="Note (for you)" htmlFor={`${k}-d`}>
        <input id={`${k}-d`} name="description" defaultValue={p?.description ?? ''} className="admin-input" />
      </Field>
      <Field label="Max uses (all)" htmlFor={`${k}-mu`} hint="Empty = no limit">
        <input id={`${k}-mu`} name="max_uses" type="number" min={1} defaultValue={p?.max_uses ?? ''} className="admin-input" />
      </Field>
      <Field label="Max uses per phone" htmlFor={`${k}-mp`}>
        <input id={`${k}-mp`} name="max_uses_per_phone" type="number" min={1} defaultValue={p?.max_uses_per_phone ?? 1} className="admin-input" />
      </Field>
      <Field label="Starts" htmlFor={`${k}-vf`}>
        <input id={`${k}-vf`} name="valid_from" type="datetime-local" defaultValue={toPkInput(p?.valid_from)} className="admin-input" />
      </Field>
      <Field label="Ends" htmlFor={`${k}-vt`}>
        <input id={`${k}-vt`} name="valid_to" type="datetime-local" defaultValue={toPkInput(p?.valid_to)} className="admin-input" />
      </Field>
      <fieldset className="md:col-span-3">
        <legend className="admin-label">Works for (none ticked = everything)</legend>
        <div className="flex flex-wrap gap-4">
          {PURPOSES.map(([v, l]) => (
            <Checkbox key={v} id={`${k}-pu-${v}`} name={`purpose_${v}`} label={l} defaultChecked={p?.purposes?.includes(v)} />
          ))}
        </div>
      </fieldset>
      <div className="flex items-end gap-3">
        <Checkbox id={`${k}-a`} name="is_active" label="Active" defaultChecked={p ? p.is_active : true} />
        <SubmitButton className="btn-sm border border-line bg-white hover:border-brand">{p ? 'Save' : 'Create code'}</SubmitButton>
      </div>
    </form>
  );
}

export default async function PromoCodesPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin();
  const promos = await q<Promo>('select * from promo_codes order by is_active desc, created_at desc');
  return (
    <>
      <PageHeader title="Promo codes" description="Discount codes people type when paying, e.g. EID50 for 50% off. Every use is recorded." />
      <Notice saved={searchParams.saved} error={searchParams.error} />
      <Section title={`Codes (${promos.length})`}>
        <div className="space-y-4">
          {promos.map((p) => (
            <div key={p.id} className="rounded-lg border border-line p-3">
              <p className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold">{p.code}</span>
                {p.is_active ? <Badge tone="green">Active</Badge> : <Badge>Off</Badge>}
                <span className="text-ink-muted">
                  Used {p.used_count}
                  {p.max_uses ? ` / ${p.max_uses}` : ''} times
                </span>
              </p>
              <PromoForm p={p} />
            </div>
          ))}
        </div>
      </Section>
      <Section title="New promo code">
        <PromoForm />
      </Section>
    </>
  );
}
