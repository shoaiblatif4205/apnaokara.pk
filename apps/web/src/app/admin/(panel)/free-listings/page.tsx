import { models } from '@apna-okara/shared';
import { q } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { toPkInput } from '@/lib/admin/form';
import { getSetting, isFreeNow, type FreeModeSettings } from '@/lib/settings';
import { Badge, Checkbox, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { saveFreeMode } from './actions';

export const metadata = { title: 'Free listings' };

const DEFAULTS: FreeModeSettings = {
  enabled: false,
  starts_at: null,
  ends_at: null,
  days_by_model: { buy_sell: 30, vehicles: 30, property: 30, jobs: 30, services: 60, business: 60 },
  models: ['buy_sell', 'vehicles', 'property', 'jobs', 'services', 'business'],
  category_slugs: null,
  max_free_ads_per_phone: 3,
  banner: { en: '', ur: '' },
};

export default async function FreeListingsPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin();
  const fm = { ...DEFAULTS, ...((await getSetting<FreeModeSettings>('public.free_mode')) ?? {}) };
  const cats = await q<{ slug: string; name_en: string; model: string }>(
    'select slug, name_en, model from categories where parent_id is null and is_active order by sort_order',
  );
  const activeNow = models.some((m) => isFreeNow(fm, m.key, cats.find((c) => c.model === m.key)?.slug ?? ''));

  return (
    <>
      <PageHeader
        title="Free listings"
        description="You decide when ads are free, for how long, and for which categories. While free, people skip the payment step, but every ad still needs your approval."
      />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4 text-sm">
        <span className="font-semibold">Right now:</span>
        {activeNow ? <Badge tone="green">Free listings are ON</Badge> : <Badge>Free listings are OFF (normal prices)</Badge>}
        {fm.enabled && !activeNow && <span className="text-ink-muted">Switched on, but outside the start/end dates.</span>}
      </div>

      <form action={saveFreeMode}>
        <Section title="Switch">
          <Checkbox name="enabled" label="Free listings ON" defaultChecked={fm.enabled} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Start (optional)" htmlFor="starts_at" hint="Pakistan time. Empty = starts as soon as you switch ON.">
              <input id="starts_at" name="starts_at" type="datetime-local" defaultValue={toPkInput(fm.starts_at)} className="admin-input" />
            </Field>
            <Field label="End (optional)" htmlFor="ends_at" hint="Empty = stays free until you switch OFF.">
              <input id="ends_at" name="ends_at" type="datetime-local" defaultValue={toPkInput(fm.ends_at)} className="admin-input" />
            </Field>
          </div>
        </Section>

        <Section title="Which models and how many days" description="Tick the models that are free. The days are how long a free ad stays live.">
          <div className="space-y-2">
            {models.map((m) => (
              <div key={m.key} className="grid items-center gap-2 rounded-lg border border-line p-3 md:grid-cols-[1fr_200px]">
                <Checkbox id={`model_${m.key}`} name={`model_${m.key}`} label={`${m.name.en} · ${m.name.ur}`} defaultChecked={fm.models.includes(m.key)} />
                <Field label="Free days" htmlFor={`days_${m.key}`}>
                  <input
                    id={`days_${m.key}`}
                    name={`days_${m.key}`}
                    type="number"
                    min={1}
                    max={365}
                    defaultValue={fm.days_by_model[m.key] ?? 30}
                    className="admin-input"
                    required
                  />
                </Field>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Only some categories (optional)" description="Leave all unticked to make every category of the ticked models free. Tick some to make only those free.">
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((c) => (
              <label key={c.slug} htmlFor={`cat-${c.slug}`} className="inline-flex min-h-[36px] items-center gap-2 text-sm">
                <input
                  id={`cat-${c.slug}`}
                  type="checkbox"
                  name="category_slugs"
                  value={c.slug}
                  defaultChecked={fm.category_slugs?.includes(c.slug)}
                  className="h-4 w-4 accent-brand"
                />
                {c.name_en}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Limits and banner">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Max free ads per phone number" htmlFor="max_free_ads_per_phone" hint="Stops misuse. Empty = no limit.">
              <input
                id="max_free_ads_per_phone"
                name="max_free_ads_per_phone"
                type="number"
                min={1}
                defaultValue={fm.max_free_ads_per_phone ?? ''}
                className="admin-input"
              />
            </Field>
            <Field label="Banner text (English)" htmlFor="banner_en" hint="Shown on site and app while free">
              <input id="banner_en" name="banner_en" defaultValue={fm.banner.en} className="admin-input" />
            </Field>
            <Field label="Banner text (Urdu)" htmlFor="banner_ur">
              <input id="banner_ur" name="banner_ur" defaultValue={fm.banner.ur} className="admin-input-ur" dir="rtl" />
            </Field>
          </div>
        </Section>

        <p className="mb-4 text-sm text-ink-muted">
          Per-ad controls (give one ad free, add extra free days, free Featured) are on each ad’s page once ad posting is built (Phase 3).
        </p>
        <SubmitButton>Save free listings</SubmitButton>
      </form>
    </>
  );
}
