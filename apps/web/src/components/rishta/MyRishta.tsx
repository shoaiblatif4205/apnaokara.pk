'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatPrice, optionLabel, RISHTA_OPTIONS } from '@apna-okara/shared';
import { Link } from '@/i18n/routing';
import type { PaymentAccounts } from '@/lib/meta';
import { uploadError } from '@/lib/shrinkImage';
import { appendPay, PaymentFields, payValid, type Method, type PayState } from './PaymentFields';

type Profile = {
  id: string; reference: string; gender: string; status: string; reject_reason: string | null; expires_at: string | null; created_by: string;
  date_of_birth: string; full_name: string | null; is_premium: boolean; photos: number; pending_payment: boolean;
};
type Me = {
  phone: string; profiles: Profile[]; active: { id: string; reference: string } | null;
  plan: { days: number; price: number; premium_price: number | null; premium_days: number; premium_interests_per_day: number }; free: { enabled: boolean };
};

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-brand-light text-brand-dark',
  rejected: 'bg-red-50 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
  hidden: 'bg-red-50 text-red-800',
  removed: 'bg-red-50 text-red-800',
};

function PayBox({ p, me, methods, accounts, onDone }: { p: Profile; me: Me; methods: Method[]; accounts: PaymentAccounts; onDone: () => void }) {
  const t = useTranslations('rishta');
  const tp = useTranslations('post');
  const [open, setOpen] = useState(false);
  const [premium, setPremium] = useState(false);
  const [pay, setPay] = useState<PayState>({ method: '', paidFrom: '', shot: null });
  const [error, setError] = useState('');
  const expired = p.status === 'expired' || (p.status === 'approved' && p.expires_at !== null && new Date(p.expires_at) <= new Date());
  const canPremium = me.plan.premium_price !== null && !p.is_premium && (p.status === 'approved' || expired);
  if (p.pending_payment) return <p className="mt-2 text-sm text-amber-900">{t('paymentPending')}</p>;
  if (!expired && !canPremium) return null;
  const total = (expired && !me.free.enabled ? me.plan.price : 0) + (premium && me.plan.premium_price ? me.plan.premium_price : 0);

  if (!open)
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {expired && (
          <button type="button" className="btn-outline" onClick={() => setOpen(true)}>
            {t('renew')}
          </button>
        )}
        {canPremium && (
          <button type="button" className="btn-outline" onClick={() => { setPremium(true); setOpen(true); }}>
            {t('buyPremium')} · {formatPrice(me.plan.premium_price!, 'en')}
          </button>
        )}
      </div>
    );
  return (
    <form
      className="mt-3 space-y-3 rounded-lg bg-page p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (total > 0 && !payValid(pay)) return setError(tp('required'));
        const fd = new FormData();
        fd.append('action', 'pay');
        fd.append('premium', String(premium));
        if (total > 0) await appendPay(fd, pay);
        const r = await fetch(`/api/rishta/profiles/${p.id}`, { method: 'POST', body: fd });
        if (r.ok) onDone();
        else setError(await uploadError(r, tp('errorGeneric'), tp('uploadTooBig')));
      }}
    >
      {canPremium && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} className="h-5 w-5 accent-pink-700" />
          {t('premium')} (+{formatPrice(me.plan.premium_price!, 'en')}): {t('premiumText', { n: me.plan.premium_interests_per_day })}
        </label>
      )}
      <p className="font-bold">
        {tp('total')}: {formatPrice(total, 'en')}
      </p>
      {total > 0 && <PaymentFields methods={methods} accounts={accounts} value={pay} onChange={setPay} />}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" className="btn bg-pink-700 text-white hover:bg-pink-800">
        {tp('submit')}
      </button>
    </form>
  );
}

export function MyRishta({ locale, methods, accounts }: { locale: 'en' | 'ur'; methods: Method[]; accounts: PaymentAccounts }) {
  const t = useTranslations('rishta');
  const [me, setMe] = useState<Me | null>(null);
  const load = useCallback(() => {
    fetch('/api/rishta/me').then(async (r) => (r.ok ? setMe(await r.json()) : (window.location.href = `/${locale}/rishta/login`)));
  }, [locale]);
  useEffect(load, [load]);
  if (!me) return null;
  const statusText: Record<string, string> = {
    pending: t('statusPending'), approved: t('statusApproved'), rejected: t('statusRejected'), expired: t('statusExpired'), hidden: t('statusHidden'), removed: t('statusRemoved'),
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('myProfiles')}</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-muted" dir="ltr">{me.phone}</span>
          <button
            type="button"
            className="btn-outline"
            onClick={async () => {
              await fetch('/api/rishta/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
              window.location.href = `/${locale}/rishta`;
            }}
          >
            {t('logout')}
          </button>
        </div>
      </div>

      {me.profiles.length === 0 && <p className="card mt-4 p-6 text-ink-muted">{t('noProfiles')}</p>}
      <ul className="mt-4 space-y-3">
        {me.profiles.map((p) => {
          const active = me.active?.id === p.id;
          return (
            <li key={p.id} className={`card p-4 ${active ? 'border-2 border-pink-700' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold" dir="ltr">
                    {p.reference}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {p.full_name} · {optionLabel(RISHTA_OPTIONS.gender, p.gender, locale)} · {optionLabel(RISHTA_OPTIONS.createdBy, p.created_by, locale)}
                  </p>
                  <p className="mt-2 text-sm">
                    <span className={`rounded-md px-2 py-0.5 font-semibold ${STATUS_STYLE[p.status] ?? ''}`}>{statusText[p.status] ?? p.status}</span>
                    {p.is_premium && <span className="ms-2 rounded-md bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">{t('premium')}</span>}
                  </p>
                  {p.reject_reason && <p className="mt-1 text-sm text-red-800">{p.reject_reason}</p>}
                  {p.expires_at && (
                    <p className="mt-1 text-xs text-ink-muted">
                      {t('expires')}: {new Date(p.expires_at).toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-PK')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.status === 'approved' && !active && (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={async () => {
                        await fetch('/api/rishta/me', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: p.id }) });
                        load();
                      }}
                    >
                      {t('useThis')}
                    </button>
                  )}
                  {active && <span className="text-sm font-semibold text-pink-700">{t('actingAs')}</span>}
                  <Link href={`/rishta/profile/${p.id}`} className="btn-outline">
                    {t('editProfile')}
                  </Link>
                </div>
              </div>
              <PayBox p={p} me={me} methods={methods} accounts={accounts} onDone={load} />
            </li>
          );
        })}
      </ul>
      <Link href="/rishta/profile/new" className="btn mt-4 bg-pink-700 text-white hover:bg-pink-800">
        {t('newProfile')}
      </Link>
    </div>
  );
}
