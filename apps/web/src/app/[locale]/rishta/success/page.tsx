import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { q } from '@/lib/db';
import type { AppLocale } from '@/i18n/routing';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'rishta' });
  return { title: t('success') };
}

export default async function RishtaSuccess(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'rishta' });
  const stories = await q<{ id: number; title_en: string; title_ur: string; body_en: string; body_ur: string; city: string | null }>(
    'select id, title_en, title_ur, body_en, body_ur, city from rishta_stories where is_published order by created_at desc',
  );
  return (
    <div className="container-site max-w-3xl py-6">
      <h1 className="text-2xl font-bold">{t('success')}</h1>
      {stories.length === 0 && <p className="card mt-4 p-6 text-ink-muted">{t('noStories')}</p>}
      <ul className="mt-4 space-y-3">
        {stories.map((s) => (
          <li key={s.id} className="card p-5">
            <h2 className="text-lg font-bold">{locale === 'ur' ? s.title_ur : s.title_en}</h2>
            {s.city && <p className="text-sm text-ink-muted">{s.city}</p>}
            <p className="mt-2 whitespace-pre-line">{locale === 'ur' ? s.body_ur : s.body_en}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
