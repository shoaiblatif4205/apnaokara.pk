'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { RishtaCard, type Card } from './RishtaCard';
import { rishtaAction } from './RishtaView';

type Row = { id: number; direction: 'sent' | 'received'; status: string; created_at: string; i_shared: boolean; other: Card; contact: { name: string; phone: string } | null };

export function RishtaInterests({ locale }: { locale: 'en' | 'ur' }) {
  const t = useTranslations('rishta');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<'received' | 'sent' | 'accepted'>('received');
  const [needProfile, setNeedProfile] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/rishta/interests');
    if (r.status === 401) return (window.location.href = `/${locale}/rishta/login`);
    if (r.status === 403) return setNeedProfile(true);
    setRows((await r.json()).interests);
  }, [locale]);
  useEffect(() => {
    void load();
  }, [load]);

  if (needProfile)
    return (
      <div className="card p-6">
        <p>{t('statusPending')}</p>
        <Link href="/rishta/me" className="btn mt-3 bg-pink-700 text-white">
          {t('myProfiles')}
        </Link>
      </div>
    );
  if (!rows) return null;
  const list = rows.filter((r) => (tab === 'accepted' ? r.status === 'accepted' : r.direction === tab && r.status !== 'accepted'));
  const act = async (body: Record<string, unknown>) => {
    try {
      await rishtaAction(body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(['received', 'sent', 'accepted'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} className={`btn-outline ${tab === k ? 'border-pink-700 bg-pink-50' : ''}`}>
            {k === 'received' ? t('received') : k === 'sent' ? t('sent') : t('acceptedTab')} (
            {rows.filter((r) => (k === 'accepted' ? r.status === 'accepted' : r.direction === k && r.status !== 'accepted')).length})
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
      {list.length === 0 && <p className="card mt-4 p-6 text-ink-muted">{t('noInterests')}</p>}
      <ul className="mt-4 grid gap-3 lg:grid-cols-2">
        {list.map((r) => (
          <li key={r.id}>
            <RishtaCard
              p={r.other}
              locale={locale}
              extra={
                <>
                  {r.status === 'sent' && r.direction === 'received' && (
                    <>
                      <button type="button" className="text-sm font-semibold text-brand" onClick={() => act({ action: 'accept', interestId: r.id, share: true })}>
                        {t('accept')}
                      </button>
                      <button type="button" className="text-sm text-ink-muted" onClick={() => act({ action: 'decline', interestId: r.id })}>
                        {t('decline')}
                      </button>
                    </>
                  )}
                  {r.status === 'sent' && r.direction === 'sent' && <span className="text-xs text-ink-muted">{t('interestSent')}</span>}
                  {r.status === 'declined' && <span className="text-xs text-ink-muted">{t('declined')}</span>}
                  {r.contact && (
                    <span className="block w-full text-sm">
                      {t('contactTitle')}: {r.contact.name} ·{' '}
                      <a href={`tel:${r.contact.phone}`} className="font-semibold text-brand" dir="ltr">
                        {r.contact.phone}
                      </a>
                    </span>
                  )}
                </>
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
