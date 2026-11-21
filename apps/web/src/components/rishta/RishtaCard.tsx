'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { UserRound } from 'lucide-react';
import { heightLabel, optionLabel, RISHTA_OPTIONS } from '@apna-okara/shared';
import { Link } from '@/i18n/routing';

export type Card = {
  reference: string; gender: string; age: number; height_cm: number | null; marital_status: string; education: string; profession: string | null;
  caste: string | null; sect: string | null; city_en: string | null; city_ur: string | null; current_city: string | null; current_country: string;
  is_premium: boolean; photo_id: number | null;
};

export function RishtaCard({ p, locale, extra }: { p: Card; locale: 'en' | 'ur'; extra?: ReactNode }) {
  const t = useTranslations('rishta');
  const city = locale === 'ur' ? p.city_ur : p.city_en;
  return (
    <article className={`card flex gap-3 p-3 ${p.is_premium ? 'border-2 border-amber-400' : ''}`}>
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-pink-50">
        {p.photo_id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/rishta/photo/${p.photo_id}`} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-pink-300">
            <UserRound size={40} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="flex items-center gap-2">
          <span className="text-base font-bold" dir="ltr">
            {p.reference}
          </span>
          {p.is_premium && <span className="rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-900">{t('premium')}</span>}
        </p>
        <p>
          {t('years', { n: p.age })} · {heightLabel(p.height_cm)} · {optionLabel(RISHTA_OPTIONS.maritalStatus, p.marital_status, locale)}
        </p>
        <p className="text-ink-muted">
          {optionLabel(RISHTA_OPTIONS.education, p.education, locale)}
          {p.profession ? ` · ${p.profession}` : ''}
        </p>
        <p className="text-ink-muted">
          {[city, p.current_country !== 'Pakistan' ? p.current_country : null, p.caste].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href={`/rishta/${p.reference}`} className="text-sm font-semibold text-pink-700 hover:underline">
            {t('view')}
          </Link>
          {extra}
        </div>
      </div>
    </article>
  );
}
