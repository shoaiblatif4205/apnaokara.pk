import { getTranslations } from 'next-intl/server';
import type { Cat, CityRow } from '@/lib/public';
import { named } from '@/lib/format';
import { AutoOpenDetails } from './AutoOpenDetails';

// Filter form (plain GET form: works without JavaScript and is crawlable).
// On mobile it is folded inside <details>.

export async function Filters({
  locale,
  action,
  category,
  cities,
  localities,
  values,
  showCity = true,
}: {
  locale: 'en' | 'ur';
  action: string;
  category?: Cat;
  cities: CityRow[];
  localities: { id: number; name_en: string; name_ur: string }[];
  values: Record<string, string | undefined>;
  showCity?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: 'browse' });
  const input = 'block min-h-[40px] w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm';
  const label = 'block text-xs font-semibold uppercase tracking-wide text-ink-muted';
  const provider = category && (category.model === 'services' || category.model === 'business');

  return (
    <AutoOpenDetails className="card group">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-4 font-bold">
        {t('filters')}
        <span className="text-ink-muted md:hidden" aria-hidden="true">
          ▾
        </span>
      </summary>
      <form action={action} method="get" className="space-y-4 px-4 pb-4">
        {values.q !== undefined && <input type="hidden" name="q" value={values.q} />}
        {values.category && <input type="hidden" name="category" value={values.category} />}

        {showCity && (
          <div>
            <label htmlFor="flt-city" className={label}>
              {t('city')}
            </label>
            <select id="flt-city" name="city" defaultValue={values.city ?? ''} className={input}>
              <option value="">{t('anyCity')}</option>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {named(c, locale)}
                </option>
              ))}
            </select>
          </div>
        )}
        {localities.length > 0 && (
          <div>
            <label htmlFor="flt-area" className={label}>
              {t('area')}
            </label>
            <select id="flt-area" name="area" defaultValue={values.area ?? ''} className={input}>
              <option value="">{t('anyArea')}</option>
              {localities.map((l) => (
                <option key={l.id} value={l.id}>
                  {named(l, locale)}
                </option>
              ))}
            </select>
          </div>
        )}

        {!provider && (
          <fieldset>
            <legend className={label}>{t('price')}</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <input name="min" type="number" min={0} inputMode="numeric" placeholder={t('min')} aria-label={`${t('price')} ${t('min')}`} defaultValue={values.min} className={input} />
              <input name="max" type="number" min={0} inputMode="numeric" placeholder={t('max')} aria-label={`${t('price')} ${t('max')}`} defaultValue={values.max} className={input} />
            </div>
          </fieldset>
        )}

        {category?.fields
          .filter((f) => f.type !== 'text' || f.key === 'brand' || f.key === 'make' || f.key === 'breed')
          .map((f) => {
            const fl = locale === 'ur' ? f.label_ur : f.label_en;
            const id = `flt-${f.key}`;
            if (f.type === 'select') {
              return (
                <div key={f.key}>
                  <label htmlFor={id} className={label}>
                    {fl}
                  </label>
                  <select id={id} name={`f_${f.key}`} defaultValue={values[`f_${f.key}`] ?? ''} className={input}>
                    <option value="">{t('any')}</option>
                    {f.options?.map((o) => (
                      <option key={o.en} value={o.en}>
                        {locale === 'ur' ? o.ur : o.en}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
            if (f.type === 'boolean') {
              return (
                <label key={f.key} htmlFor={id} className="flex min-h-[36px] items-center gap-2 text-sm">
                  <input id={id} type="checkbox" name={`f_${f.key}`} value="true" defaultChecked={values[`f_${f.key}`] === 'true'} className="h-4 w-4 accent-brand" />
                  {fl}
                </label>
              );
            }
            if (f.type === 'text') {
              return (
                <div key={f.key}>
                  <label htmlFor={id} className={label}>
                    {fl}
                  </label>
                  <input id={id} name={`f_${f.key}`} defaultValue={values[`f_${f.key}`]} className={input} />
                </div>
              );
            }
            const unit = locale === 'ur' ? f.unit_ur : f.unit_en;
            return (
              <fieldset key={f.key}>
                <legend className={label}>
                  {fl}
                  {unit ? ` (${unit})` : ''}
                </legend>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input name={`f_${f.key}_min`} type="number" min={0} placeholder={t('min')} aria-label={`${fl} ${t('min')}`} defaultValue={values[`f_${f.key}_min`]} className={input} />
                  <input name={`f_${f.key}_max`} type="number" min={0} placeholder={t('max')} aria-label={`${fl} ${t('max')}`} defaultValue={values[`f_${f.key}_max`]} className={input} />
                </div>
              </fieldset>
            );
          })}

        <div>
          <label htmlFor="flt-within" className={label}>
            {t('postedWithin')}
          </label>
          <select id="flt-within" name="within" defaultValue={values.within ?? ''} className={input}>
            <option value="">{t('anyTime')}</option>
            <option value="1">{t('today')}</option>
            <option value="7">{t('week')}</option>
            <option value="30">{t('month')}</option>
          </select>
        </div>
        <label htmlFor="flt-featured" className="flex min-h-[36px] items-center gap-2 text-sm">
          <input id="flt-featured" type="checkbox" name="featured" value="1" defaultChecked={values.featured === '1'} className="h-4 w-4 accent-brand" />
          {t('featuredOnly')}
        </label>
        {provider && (
          <label htmlFor="flt-verified" className="flex min-h-[36px] items-center gap-2 text-sm">
            <input id="flt-verified" type="checkbox" name="verified" value="1" defaultChecked={values.verified === '1'} className="h-4 w-4 accent-brand" />
            {t('verifiedOnly')}
          </label>
        )}
        <input type="hidden" name="sort" value={values.sort ?? ''} />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary flex-1">
            {t('applyFilters')}
          </button>
          <a href={action + (values.q ? `?q=${encodeURIComponent(values.q)}` : '')} className="btn-outline">
            {t('clearFilters')}
          </a>
        </div>
      </form>
    </AutoOpenDetails>
  );
}
