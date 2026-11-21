import { getTranslations } from 'next-intl/server';
import { Lock, UserRound } from 'lucide-react';
import { optionLabel, RISHTA_OPTIONS } from '@apna-okara/shared';
import { Link } from '@/i18n/routing';
import type { PreviewCard } from '@/lib/rishta/profiles';

// Safe preview cards for visitors. data-nosnippet keeps them out of Google results.
export async function RishtaPreview({ profiles, locale, loggedIn, total }: { profiles: PreviewCard[]; locale: 'en' | 'ur'; loggedIn: boolean; total: { male: number; female: number } }) {
  const t = await getTranslations({ locale, namespace: 'rishta' });
  if (!profiles.length) return null;
  return (
    <div data-nosnippet="">
      <p className="text-sm text-ink-muted">{t('previewCount', { girls: total.female, boys: total.male })}</p>
      <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {profiles.map((p) => (
          <li key={p.reference}>
            <Link
              href={loggedIn ? `/rishta/${p.reference}` : '/rishta/signup'}
              className={`card flex h-full flex-col items-center gap-1 p-4 text-center text-sm hover:border-pink-700 ${p.is_premium ? 'border-2 border-amber-400' : ''}`}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink-300">
                <UserRound size={36} aria-hidden="true" />
              </span>
              <span className="font-bold" dir="ltr">
                {p.reference}
              </span>
              <span>
                {p.gender === 'female' ? t('girl') : t('boy')} · {t('years', { n: p.age })}
              </span>
              <span className="text-ink-muted">{optionLabel(RISHTA_OPTIONS.education, p.education, locale)}</span>
              <span className="text-ink-muted">
                {(locale === 'ur' ? p.city_ur : p.city_en) ?? ''}
                {p.current_country !== 'Pakistan' ? ` · ${p.current_country}` : ''}
              </span>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold text-pink-700">
                {!loggedIn && <Lock size={12} aria-hidden="true" />}
                {loggedIn ? t('view') : t('loginToSee')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
