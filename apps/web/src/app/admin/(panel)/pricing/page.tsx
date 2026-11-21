import { AD_DURATIONS, models, PROVIDER_PLAN } from '@apna-okara/shared';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { getSetting } from '@/lib/settings';
import { BANNER_DAYS, BANNER_PLACEMENTS, PLACEMENT_INFO } from '@/lib/bannerConfig';
import { Checkbox, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { addOverride, deleteOverride, saveAddons, saveBannerPrices, saveDefaultPrices, saveRishtaPlan } from './actions';

export const metadata = { title: 'Pricing' };

type PriceRow = { id: number; model: string; category_id: number | null; duration_days: number; price: number; category: string | null };

export default async function PricingPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin();
  const rishtaPreview = await getSetting<{ enabled?: boolean }>('public.rishta_preview');
  const [rishtaPlan, rishtaFree] = await Promise.all([
    getSetting<{ price: number; days: number; premium_price: number | null; premium_days: number; interests_per_day: number; premium_interests_per_day: number; coordinator_fee: number | null }>('public.rishta_plan'),
    getSetting<{ enabled: boolean; days: number }>('public.rishta_free_mode'),
  ]);
  const [rows, addons, cats, banners, bannerSettings] = await Promise.all([
    q<PriceRow>(
      `select p.id, p.model::text, p.category_id, p.duration_days, p.price, c.name_en as category
         from pricing p left join categories c on c.id = p.category_id where p.is_active order by c.sort_order nulls first, p.duration_days`,
    ),
    q<{ key: string; price: number; is_active: boolean; name_en: string }>('select key, price, is_active, name_en from addons order by key'),
    q<{ id: number; name_en: string; model: string }>(`select id, name_en, model::text from categories where parent_id is null and is_active order by sort_order`),
    q<{ placement: string; days: number; price: number }>('select placement, days, price from banner_pricing where is_active'),
    getSetting<{ design_price?: number | null; popup_enabled?: boolean; max_per_placement?: number }>('public.banner_settings'),
  ]);
  const def = (model: string, d: number) => rows.find((r) => r.category_id === null && r.model === model && r.duration_days === d)?.price;
  const overrides = rows.filter((r) => r.category_id !== null);
  const bp = (p: string, d: number) => banners.find((b) => b.placement === p && b.days === d)?.price;
  const adModels = models.filter((m) => m.billing === 'per_duration');

  return (
    <>
      <PageHeader title="Pricing" description="All prices in rupees. Changes apply to new ads at once. Ads already posted keep the price they paid." />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      <div id="defaults" className="scroll-mt-6">
        <Section title="Default ad prices" description="Used for every category unless a category has its own price below.">
          <form action={saveDefaultPrices}>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    {AD_DURATIONS.map((d) => (
                      <th key={d}>{d} days</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {adModels.map((m) => (
                    <tr key={m.key}>
                      <td className="font-medium">{m.name.en}</td>
                      {AD_DURATIONS.map((d) => (
                        <td key={d}>
                          <label htmlFor={`p_${m.key}_${d}`} className="sr-only">
                            {m.name.en} {d} days
                          </label>
                          <input id={`p_${m.key}_${d}`} name={`p_${m.key}_${d}`} type="number" min={0} defaultValue={def(m.key, d)} className="admin-input w-24" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {['services', 'business'].map((m) => (
                <Field key={m} label={`${m === 'services' ? 'Service providers' : 'Businesses'}: one-time fee (no renewal)`} htmlFor={`p_${m}_${PROVIDER_PLAN.days}`}>
                  <input id={`p_${m}_${PROVIDER_PLAN.days}`} name={`p_${m}_${PROVIDER_PLAN.days}`} type="number" min={0} defaultValue={def(m, PROVIDER_PLAN.days)} className="admin-input" />
                </Field>
              ))}
            </div>
            <div className="mt-4">
              <SubmitButton>Save default prices</SubmitButton>
            </div>
          </form>
        </Section>
      </div>

      <div id="overrides" className="scroll-mt-6">
        <Section title={`Category prices (${overrides.length})`} description="A different price for one category, e.g. Property 7 days = Rs 250.">
          <ul className="space-y-2">
            {overrides.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2 text-sm">
                <span>
                  <span className="font-semibold">{o.category}</span> · {o.duration_days} days · Rs {o.price.toLocaleString('en-PK')}
                </span>
                <form action={deleteOverride}>
                  <input type="hidden" name="id" value={o.id} />
                  <SubmitButton className="btn-danger" confirm="Remove this category price? The default price will apply.">
                    Remove
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
          <form action={addOverride} className="mt-4 grid items-end gap-3 rounded-lg bg-page p-3 md:grid-cols-[1fr_140px_160px_auto]">
            <Field label="Category" htmlFor="ov-cat">
              <select id="ov-cat" name="category_id" className="admin-input" required>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_en}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Days" htmlFor="ov-days" hint="Services/Business: 60">
              <select id="ov-days" name="days" className="admin-input">
                {[...AD_DURATIONS, PROVIDER_PLAN.days].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Price (Rs)" htmlFor="ov-price">
              <input id="ov-price" name="price" type="number" min={0} className="admin-input" required />
            </Field>
            <SubmitButton>Add category price</SubmitButton>
          </form>
        </Section>
      </div>

      <div id="addons" className="scroll-mt-6">
        <Section title="Add-ons" description="Featured lasts as long as the ad. WhatsApp Boost puts the ad in the WhatsApp group and Facebook page.">
          <form action={saveAddons} className="grid gap-4 md:grid-cols-2">
            {addons.map((a) => (
              <div key={a.key} className="rounded-lg border border-line p-3">
                <Field label={`${a.name_en} price (Rs)`} htmlFor={`${a.key}_price`}>
                  <input id={`${a.key}_price`} name={`${a.key}_price`} type="number" min={0} defaultValue={a.price} className="admin-input" required />
                </Field>
                <div className="mt-2">
                  <Checkbox id={`${a.key}_active`} name={`${a.key}_active`} label="Offer this add-on" defaultChecked={a.is_active} />
                </div>
              </div>
            ))}
            <div className="md:col-span-2">
              <SubmitButton>Save add-ons</SubmitButton>
            </div>
          </form>
        </Section>
      </div>

      <div id="rishta" className="scroll-mt-6">
        <Section title="Rishta" description="Profile fee and Premium. Free Mode for Rishta is separate from ads.">
          <form action={saveRishtaPlan} className="grid gap-4 md:grid-cols-4">
            <Field label="Profile fee (Rs)" htmlFor="r-price"><input id="r-price" name="price" type="number" min={0} defaultValue={rishtaPlan?.price ?? 1000} className="admin-input" /></Field>
            <Field label="For days" htmlFor="r-days"><input id="r-days" name="days" type="number" min={1} defaultValue={rishtaPlan?.days ?? 90} className="admin-input" /></Field>
            <Field label="Premium price (Rs)" htmlFor="r-pp" hint="Empty = no Premium"><input id="r-pp" name="premium_price" type="number" min={0} defaultValue={rishtaPlan?.premium_price ?? ''} className="admin-input" /></Field>
            <Field label="Premium days" htmlFor="r-pd"><input id="r-pd" name="premium_days" type="number" min={1} defaultValue={rishtaPlan?.premium_days ?? 90} className="admin-input" /></Field>
            <Field label="Interests per day" htmlFor="r-ip"><input id="r-ip" name="interests_per_day" type="number" min={1} defaultValue={rishtaPlan?.interests_per_day ?? 10} className="admin-input" /></Field>
            <Field label="Premium interests per day" htmlFor="r-pip"><input id="r-pip" name="premium_interests_per_day" type="number" min={1} defaultValue={rishtaPlan?.premium_interests_per_day ?? 30} className="admin-input" /></Field>
            <Field label="Coordinator service fee (Rs)" htmlFor="r-cf" hint="Shown to families; collected by you"><input id="r-cf" name="coordinator_fee" type="number" min={0} defaultValue={rishtaPlan?.coordinator_fee ?? ''} className="admin-input" /></Field>
            <div />
            <div className="flex items-end"><Checkbox name="free_enabled" label="Rishta profiles free now" defaultChecked={rishtaFree?.enabled === true} /></div>
            <Field label="Free profile days" htmlFor="r-fd"><input id="r-fd" name="free_days" type="number" min={1} defaultValue={rishtaFree?.days ?? 90} className="admin-input" /></Field>
            <div className="flex items-end md:col-span-2">
              <Checkbox name="preview_enabled" label="Show recent profiles to visitors (ID, age, city, education only)" defaultChecked={rishtaPreview?.enabled !== false} />
            </div>
            <div className="md:col-span-4"><SubmitButton>Save Rishta prices</SubmitButton></div>
          </form>
        </Section>
      </div>

      <div id="banners" className="scroll-mt-6">
        <Section title="Banner prices" description="Leave a box empty to not offer that place / length on the Advertise page. Brands only see places that have a price.">
          <form action={saveBannerPrices}>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Place</th>
                    {BANNER_DAYS.map((d) => (
                      <th key={d}>{d} days</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BANNER_PLACEMENTS.map((p) => (
                    <tr key={p}>
                      <td>
                        <span className="font-medium">{PLACEMENT_INFO[p].en}</span>
                        <span className="block text-xs text-ink-muted">{PLACEMENT_INFO[p].size}</span>
                      </td>
                      {BANNER_DAYS.map((d) => (
                        <td key={d}>
                          <label htmlFor={`b_${p}_${d}`} className="sr-only">
                            {PLACEMENT_INFO[p].en} {d} days
                          </label>
                          <input id={`b_${p}_${d}`} name={`b_${p}_${d}`} type="number" min={0} defaultValue={bp(p, d)} className="admin-input w-28" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="Banner design service (Rs)" htmlFor="design_price" hint="Empty = not offered">
                <input id="design_price" name="design_price" type="number" min={0} defaultValue={bannerSettings?.design_price ?? ''} className="admin-input" />
              </Field>
              <Field label="Max banners per place" htmlFor="max_per_placement">
                <input id="max_per_placement" name="max_per_placement" type="number" min={1} defaultValue={bannerSettings?.max_per_placement ?? 5} className="admin-input" />
              </Field>
              <div className="flex items-end">
                <Checkbox name="popup_enabled" label="Allow popup banners" defaultChecked={bannerSettings?.popup_enabled === true} />
              </div>
            </div>
            <div className="mt-4">
              <SubmitButton>Save banner prices</SubmitButton>
            </div>
          </form>
        </Section>
      </div>
    </>
  );
}
