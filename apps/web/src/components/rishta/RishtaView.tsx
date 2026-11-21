'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Phone, UserRound } from 'lucide-react';
import { heightLabel, optionLabel, RISHTA_OPTIONS, toWhatsAppNumber } from '@apna-okara/shared';
import type { Card } from './RishtaCard';

type View = Card & {
  created_by: string; complexion: string | null; children: number; religion: string | null; income_range: string | null; house_type: string | null;
  father_profession: string | null; mother_profession: string | null; brothers: number | null; sisters: number | null; married_siblings: number | null;
  family_type: string | null; about: string | null; looking_for: { ageMin?: number | null; ageMax?: number | null; notes?: string };
  photos: { id: number; clear: boolean }[];
  interest: { id: number; direction: 'sent' | 'received'; status: string; mediation: boolean; iShared: boolean; theyShared: boolean } | null;
  contact: { name: string; phone: string } | null;
  blocked: boolean;
};

export async function rishtaAction(body: Record<string, unknown>) {
  const r = await fetch('/api/rishta/interests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json()).message);
}

export function RishtaView({ reference, locale }: { reference: string; locale: 'en' | 'ur' }) {
  const t = useTranslations('rishta');
  const [p, setP] = useState<View | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState(0);

  const load = useCallback(async () => {
    const r = await fetch(`/api/rishta/view/${reference}`);
    if (r.status === 401) return (window.location.href = `/${locale}/rishta/login`);
    const j = await r.json();
    if (!r.ok) return setError(j.message);
    setP(j.profile);
  }, [reference, locale]);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (body: Record<string, unknown>, done?: string) => {
    setError('');
    try {
      await rishtaAction(body);
      if (done) setNotice(done);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  if (error && !p) return <p role="alert" className="card p-6 text-red-700">{error}</p>;
  if (!p) return null;
  const L = (k: keyof typeof RISHTA_OPTIONS, v: string | null) => optionLabel(RISHTA_OPTIONS[k], v, locale);
  const rows: [string, string][] = [
    [t('height'), heightLabel(p.height_cm)],
    [t('complexion'), L('complexion', p.complexion)],
    [t('marital'), L('maritalStatus', p.marital_status)],
    [t('children'), String(p.children ?? 0)],
    [t('religion'), L('religion', p.religion)],
    [t('sect'), L('sect', p.sect)],
    [t('caste'), p.caste ?? '-'],
    [t('education'), L('education', p.education)],
    [t('profession'), p.profession ?? '-'],
    [t('income'), L('income', p.income_range)],
    [t('city'), (locale === 'ur' ? p.city_ur : p.city_en) ?? '-'],
    [t('livingIn'), [p.current_city, p.current_country].filter(Boolean).join(', ')],
    [t('house'), L('houseType', p.house_type)],
    [t('createdBy'), L('createdBy', p.created_by)],
  ];
  const family: [string, string][] = [
    [t('father'), p.father_profession ?? '-'],
    [t('mother'), p.mother_profession ?? '-'],
    [t('brothers'), p.brothers === null ? '-' : String(p.brothers)],
    [t('sisters'), p.sisters === null ? '-' : String(p.sisters)],
    [t('married'), p.married_siblings === null ? '-' : String(p.married_siblings)],
    [t('familyType'), L('familyType', p.family_type)],
  ];
  const i = p.interest;
  const current = p.photos[photo];

  return (
    <div className="grid gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div className="card overflow-hidden">
          <div className="aspect-[3/4] bg-pink-50" onContextMenu={(e) => e.preventDefault()}>
            {current ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/rishta/photo/${current.id}${current.clear ? '?v=clear' : ''}`} alt="" draggable={false} className="h-full w-full select-none object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-pink-300">
                <UserRound size={80} aria-hidden="true" />
              </span>
            )}
          </div>
          {p.photos.length > 1 && (
            <div className="flex gap-1 p-2">
              {p.photos.map((ph, k) => (
                <button key={ph.id} type="button" onClick={() => setPhoto(k)} aria-label={`${k + 1}`} className={`h-2 flex-1 rounded ${k === photo ? 'bg-pink-700' : 'bg-gray-200'}`} />
              ))}
            </div>
          )}
        </div>

        <div className="card space-y-2 p-4">
          {notice && <p role="status" className="text-sm text-brand-dark">{notice}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {p.blocked ? (
            <>
              <p className="text-sm">{t('blocked')}</p>
              <button type="button" className="btn-outline w-full" onClick={() => act({ action: 'unblock', reference })}>
                {t('unblock')}
              </button>
            </>
          ) : !i || i.status === 'withdrawn' ? (
            <button type="button" className="btn w-full bg-pink-700 text-white hover:bg-pink-800" onClick={() => act({ action: 'send', reference })}>
              {t('sendInterest')}
            </button>
          ) : i.status === 'sent' && i.direction === 'sent' ? (
            <>
              <p className="text-sm">{t('interestSent')}</p>
              <button type="button" className="btn-outline w-full" onClick={() => act({ action: 'withdraw', interestId: i.id })}>
                {t('withdraw')}
              </button>
            </>
          ) : i.status === 'sent' && i.direction === 'received' ? (
            <>
              <p className="text-sm font-semibold">{t('interestReceived')}</p>
              <button type="button" className="btn w-full bg-pink-700 text-white" onClick={() => act({ action: 'accept', interestId: i.id, share: true })}>
                {t('acceptShare')}
              </button>
              <button type="button" className="btn-outline w-full" onClick={() => act({ action: 'accept', interestId: i.id, share: false })}>
                {t('accept')}
              </button>
              <button type="button" className="btn-outline w-full" onClick={() => act({ action: 'decline', interestId: i.id })}>
                {t('decline')}
              </button>
            </>
          ) : i.status === 'accepted' ? (
            <>
              <p className="font-bold text-brand-dark">{t('accepted')}</p>
              {p.contact && (
                <div className="rounded-lg bg-brand-light p-3 text-sm">
                  <p className="font-semibold">{t('contactTitle')}</p>
                  <p>{p.contact.name}</p>
                  <div className="mt-2 flex gap-2">
                    <a href={`tel:${p.contact.phone}`} className="btn-primary" dir="ltr">
                      <Phone size={16} aria-hidden="true" /> {p.contact.phone}
                    </a>
                    <a href={`https://wa.me/${toWhatsAppNumber(p.contact.phone)}`} target="_blank" rel="noopener noreferrer" className="btn-outline">
                      WhatsApp
                    </a>
                  </div>
                </div>
              )}
              <button type="button" className="btn-outline w-full" onClick={() => act({ action: 'share', interestId: i.id, share: !i.iShared })}>
                {i.iShared ? t('unsharePhotos') : t('sharePhotos')}
              </button>
            </>
          ) : (
            <p className="text-sm text-ink-muted">{t('declined')}</p>
          )}

          {i && (i.status === 'sent' || i.status === 'accepted') && !i.mediation && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold">{t('mediation')}</summary>
              <label htmlFor="med-note" className="sr-only">{t('mediationNote')}</label>
              <textarea id="med-note" rows={2} maxLength={500} placeholder={t('mediationNote')} value={note} onChange={(e) => setNote(e.target.value)} className="mt-2 w-full rounded-lg border border-line p-2" />
              <button type="button" className="btn-outline mt-1" onClick={() => act({ action: 'mediate', interestId: i.id, note }, t('mediationSent'))}>
                {t('mediation')}
              </button>
            </details>
          )}
          {i?.mediation && <p className="text-sm text-ink-muted">{t('mediationSent')}</p>}

          {!p.blocked && (
            <div className="flex flex-wrap gap-3 border-t border-line pt-2 text-sm">
              <button type="button" className="text-ink-muted underline" onClick={() => act({ action: 'block', reference })}>
                {t('block')}
              </button>
              <details>
                <summary className="cursor-pointer text-ink-muted underline">{t('report')}</summary>
                <label htmlFor="rep" className="sr-only">{t('reportReason')}</label>
                <input id="rep" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('reportReason')} className="mt-2 w-full rounded-lg border border-line p-2" />
                <button type="button" className="btn-outline mt-1" onClick={() => act({ action: 'report', reference, reason }, '✓')}>
                  {t('report')}
                </button>
              </details>
            </div>
          )}
        </div>
      </aside>

      <section className="space-y-4">
        <div className="card p-4 md:p-6">
          <h1 className="text-2xl font-bold" dir="ltr">
            {p.reference}
          </h1>
          <p className="text-ink-muted">
            {t('years', { n: p.age })} · {L('gender', p.gender)}
          </p>
          <h2 className="mt-4 font-bold">{t('details')}</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
            {rows.map(([k, v]) => (
              <div key={k} className="border-b border-line pb-1">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="font-semibold">{v || '-'}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="card p-4 md:p-6">
          <h2 className="font-bold">{t('family')}</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
            {family.map(([k, v]) => (
              <div key={k} className="border-b border-line pb-1">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        {(p.about || p.looking_for?.notes || p.looking_for?.ageMin) && (
          <div className="card p-4 md:p-6">
            {p.about && (
              <>
                <h2 className="font-bold">{t('about')}</h2>
                <p className="mt-1 whitespace-pre-line">{p.about}</p>
              </>
            )}
            {(p.looking_for?.ageMin || p.looking_for?.notes) && (
              <>
                <h2 className="mt-4 font-bold">{t('lookingFor')}</h2>
                {p.looking_for.ageMin && (
                  <p>
                    {t('ageFrom')} {p.looking_for.ageMin}–{p.looking_for.ageMax ?? ''}
                  </p>
                )}
                {p.looking_for.notes && <p className="whitespace-pre-line text-ink-muted">{p.looking_for.notes}</p>}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
