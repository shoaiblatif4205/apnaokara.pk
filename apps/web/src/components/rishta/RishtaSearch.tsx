'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RISHTA_OPTIONS } from '@apna-okara/shared';
import { Link } from '@/i18n/routing';
import { RishtaCard, type Card } from './RishtaCard';

export function RishtaSearch({ locale, cities }: { locale: 'en' | 'ur'; cities: { slug: string; name: string }[] }) {
  const t = useTranslations('rishta');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ profiles: Card[]; total: number; page: number; pages: number } | null>(null);
  const [error, setError] = useState('');
  const [needProfile, setNeedProfile] = useState(false);

  const run = useCallback(
    async (page = 1) => {
      const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), page: String(page) });
      const r = await fetch(`/api/rishta/search?${qs.toString()}`);
      const j = await r.json();
      if (r.status === 401) return (window.location.href = `/${locale}/rishta/login`);
      if (r.status === 403) return setNeedProfile(true);
      if (!r.ok) return setError(j.message);
      setResult(page === 1 ? j : (prev) => (prev ? { ...j, profiles: [...prev.profiles, ...j.profiles] } : j));
    },
    [filters, locale],
  );
  useEffect(() => {
    void run(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const input = 'block min-h-[40px] w-full rounded-lg border border-line bg-white px-2 text-sm';
  const set = (k: string) => (e: { target: { value: string } }) => setFilters({ ...filters, [k]: e.target.value });
  const opts = (list: readonly { value: string; label: { en: string; ur: string } }[]) =>
    list.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label[locale]}
      </option>
    ));

  if (needProfile)
    return (
      <div className="card p-6">
        <p>{t('statusPending')}</p>
        <Link href="/rishta/me" className="btn mt-3 bg-pink-700 text-white">
          {t('myProfiles')}
        </Link>
      </div>
    );

  return (
    <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
      <form
        className="card space-y-3 self-start p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(1);
        }}
      >
        <h2 className="font-bold">{t('filters')}</h2>
        <div>
          <label htmlFor="rs-g" className="text-xs font-semibold uppercase text-ink-muted">{t('show')}</label>
          <select id="rs-g" value={filters.gender ?? ''} onChange={set('gender')} className={input}>
            <option value="">{t('any')}</option>
            <option value="female">{t('girl')}</option>
            <option value="male">{t('boy')}</option>
          </select>
        </div>
        <fieldset>
          <legend className="text-xs font-semibold uppercase text-ink-muted">{t('ageFrom')}</legend>
          <div className="grid grid-cols-2 gap-2">
            <input aria-label={t('ageFrom')} type="number" min={18} max={80} value={filters.ageMin ?? ''} onChange={set('ageMin')} className={input} />
            <input aria-label={t('ageTo')} type="number" min={18} max={80} value={filters.ageMax ?? ''} onChange={set('ageMax')} className={input} />
          </div>
        </fieldset>
        <div>
          <label htmlFor="rs-c" className="text-xs font-semibold uppercase text-ink-muted">{t('city')}</label>
          <select id="rs-c" value={filters.city ?? ''} onChange={set('city')} className={input}>
            <option value="">{t('any')}</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rs-co" className="text-xs font-semibold uppercase text-ink-muted">{t('country')}</label>
          <input id="rs-co" value={filters.country ?? ''} onChange={set('country')} placeholder="Pakistan" className={input} />
        </div>
        <div>
          <label htmlFor="rs-e" className="text-xs font-semibold uppercase text-ink-muted">{t('education')}</label>
          <select id="rs-e" value={filters.education ?? ''} onChange={set('education')} className={input}>
            <option value="">{t('any')}</option>
            {opts(RISHTA_OPTIONS.education)}
          </select>
        </div>
        <div>
          <label htmlFor="rs-ca" className="text-xs font-semibold uppercase text-ink-muted">{t('caste')}</label>
          <input id="rs-ca" value={filters.caste ?? ''} onChange={set('caste')} className={input} />
        </div>
        <div>
          <label htmlFor="rs-s" className="text-xs font-semibold uppercase text-ink-muted">{t('sect')}</label>
          <select id="rs-s" value={filters.sect ?? ''} onChange={set('sect')} className={input}>
            <option value="">{t('any')}</option>
            {opts(RISHTA_OPTIONS.sect)}
          </select>
        </div>
        <div>
          <label htmlFor="rs-m" className="text-xs font-semibold uppercase text-ink-muted">{t('marital')}</label>
          <select id="rs-m" value={filters.marital ?? ''} onChange={set('marital')} className={input}>
            <option value="">{t('any')}</option>
            {opts(RISHTA_OPTIONS.maritalStatus)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filters.photo === '1'} onChange={(e) => setFilters({ ...filters, photo: e.target.checked ? '1' : '' })} className="accent-pink-700" />
          {t('withPhoto')}
        </label>
        <button type="submit" className="btn w-full bg-pink-700 text-white hover:bg-pink-800">
          {t('search')}
        </button>
      </form>
      <section>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {result && (
          <>
            <p className="mb-3 text-sm text-ink-muted">{t('results', { count: result.total })}</p>
            {result.profiles.length ? (
              <ul className="grid gap-3 lg:grid-cols-2">
                {result.profiles.map((p) => (
                  <li key={p.reference}>
                    <RishtaCard p={p} locale={locale} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="card p-8 text-center text-ink-muted">{t('noResults')}</p>
            )}
            {result.page < result.pages && (
              <button type="button" className="btn-outline mt-4" onClick={() => run(result.page + 1)}>
                {t('show')}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
