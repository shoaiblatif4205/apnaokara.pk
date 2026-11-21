'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@apna-okara/shared';
import type { MyAd } from '@/lib/listings';

const METHOD_LABEL = { jazzcash: 'JazzCash', easypaisa: 'Easypaisa', nayapay: 'NayaPay', bank: 'Bank transfer' } as const;
type Method = keyof typeof METHOD_LABEL;

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-brand-light text-brand-dark',
  rejected: 'bg-red-50 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
  removed: 'bg-red-50 text-red-800',
  sold: 'bg-gray-100 text-gray-800',
};

/** Invite friends: share a link with your code; after N friends post, get a free ad. */
function ReferralBox({ r, locale }: { r: NonNullable<MyAd['referral']>; locale: 'en' | 'ur' }) {
  const t = useTranslations('myAds');
  const link = `${typeof window === 'undefined' ? '' : window.location.origin}/${locale}/post-ad?ref=${r.code}`;
  const text = t('inviteMessage', { link });
  const done = Math.min(r.qualified, r.needed);
  return (
    <section aria-labelledby="invite" className="rounded-xl border border-brand/30 bg-brand-light/40 p-4">
      <h3 id="invite" className="font-bold">{t('inviteTitle')}</h3>
      <p className="mt-1 text-sm">{t('inviteText', { n: r.needed, days: r.rewardDays })}</p>
      <p className="mt-3 text-sm">
        {t('yourCode')}: <span className="rounded bg-white px-2 py-1 font-mono font-bold" dir="ltr">{r.code}</span>
      </p>
      <div className="mt-3" aria-label={t('progress', { done, n: r.needed })}>
        <div className="h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-brand" style={{ width: `${(done / r.needed) * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          {t('progress', { done, n: r.needed })}
          {r.pending > 0 && ` · ${t('pendingCount', { n: r.pending })}`}
        </p>
      </div>
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3">
        {t('shareInvite')}
      </a>
      {r.rewards.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-bold">{t('rewardTitle')}</p>
          <ul className="mt-1 space-y-1 text-sm">
            {r.rewards.map((w) => (
              <li key={w.code}>
                <span className="font-mono font-bold" dir="ltr">{w.code}</span> · {w.used ? t('rewardUsed') : t('rewardHow')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function UpgradeBox({
  ad,
  locale,
  methods,
  busy,
  onSubmit,
}: {
  ad: MyAd;
  locale: 'en' | 'ur';
  methods: Method[];
  busy: boolean;
  onSubmit: (extra: Record<string, string | Blob>) => Promise<void>;
}) {
  const t = useTranslations('myAds');
  const tp = useTranslations('post');
  const [featured, setFeatured] = useState(false);
  const [boost, setBoost] = useState(false);
  const [promo, setPromo] = useState('');
  const [total, setTotal] = useState<number | null>(null);
  const [method, setMethod] = useState<Method | ''>('');
  const [tid, setTid] = useState('');
  const [shot, setShot] = useState<File | null>(null);
  const [error, setError] = useState('');
  const up = ad.upgrade!;

  useEffect(() => {
    if (!featured && !boost) return setTotal(null);
    fetch('/api/v1/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upgrade: true, featured, boost, promoCode: promo }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (r.ok) {
          setTotal(j.total);
          setError('');
        } else setError(j.message);
      })
      .catch(() => {});
  }, [featured, boost, promo]);

  if (up.pending) return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t('upgradePending')}</p>;
  const inputCls = 'block min-h-[44px] w-full rounded-lg border border-line bg-white px-3 py-2 text-base';
  return (
    <form
      className="rounded-lg border border-accent bg-accent-light/40 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!featured && !boost) return setError(tp('required'));
        const extra: Record<string, string | Blob> = { action: 'upgrade', featured: String(featured), boost: String(boost), promoCode: promo };
        if ((total ?? 1) > 0) {
          if (!method || tid.trim().length < 4 || !shot) return setError(tp('required'));
          Object.assign(extra, { method, transactionId: tid.trim(), screenshot: shot });
        }
        await onSubmit(extra);
      }}
    >
      <h3 className="font-bold">{t('upgradeTitle')}</h3>
      <p className="text-sm text-ink-muted">{t('upgradeText')}</p>
      <div className="mt-3 grid gap-2">
        {up.featured !== null && (
          <label className="flex min-h-[44px] items-center gap-2">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-5 w-5 accent-accent" />
            {tp('featuredInfo').split(':')[0]} · +{formatPrice(up.featured, locale)}
          </label>
        )}
        {up.boost !== null && (
          <label className="flex min-h-[44px] items-center gap-2">
            <input type="checkbox" checked={boost} onChange={(e) => setBoost(e.target.checked)} className="h-5 w-5 accent-accent" />
            {tp('boostInfo').split(':')[0]} · +{formatPrice(up.boost, locale)}
          </label>
        )}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="up-promo" className="block text-sm font-semibold">
            {tp('promoCode')}
          </label>
          <input id="up-promo" dir="ltr" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} className={inputCls} />
        </div>
        {total !== null && (
          <p className="self-end text-lg font-bold">
            {tp('total')}: {formatPrice(total, locale)}
          </p>
        )}
      </div>
      {(total ?? 1) > 0 && (featured || boost) && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <label htmlFor="up-method" className="block text-sm font-semibold">
              {tp('payMethod')}
            </label>
            <select id="up-method" value={method} onChange={(e) => setMethod(e.target.value as Method)} className={inputCls}>
              <option value="">{tp('select')}</option>
              {methods.map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="up-tid" className="block text-sm font-semibold">
              {tp('transactionId')}
            </label>
            <input id="up-tid" dir="ltr" value={tid} onChange={(e) => setTid(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="up-shot" className="block text-sm font-semibold">
              {tp('screenshot')}
            </label>
            <input id="up-shot" type="file" accept="image/*" onChange={(e) => setShot(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" className="btn-accent mt-3" disabled={busy}>
        {t('upgradeSend')}
      </button>
    </form>
  );
}

export function MyAdLookup({ locale, initialRef, initialKey, paymentMethods }: { locale: 'en' | 'ur'; initialRef?: string; initialKey?: string; paymentMethods: Method[] }) {
  const t = useTranslations('myAds');
  const tp = useTranslations('post');
  const tr = useTranslations('reviews');
  const [reference, setReference] = useState(initialRef ?? '');
  const [phone, setPhone] = useState('');
  // Secret manage code (from the link we gave after posting, or saved on this device)
  const [key, setKey] = useState((initialKey ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
  const [keyInput, setKeyInput] = useState('');
  const [ad, setAd] = useState<MyAd | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ reference: string; phone: string; key?: string }[]>([]);
  const [message, setMessage] = useState('');
  const [days, setDays] = useState<number | null>(null);
  const [method, setMethod] = useState<Method | ''>('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem('ao.myAds') || '[]'));
    } catch {
      /* storage not available */
    }
  }, []);

  async function call(extra?: Record<string, string | Blob>, refArg = reference, phoneArg = phone, keyArg = key) {
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('reference', refArg.trim());
    fd.append('phone', phoneArg.trim());
    const k = keyArg || saved.find((s) => s.reference === refArg.trim().toUpperCase())?.key || '';
    if (k) fd.append('key', k);
    for (const [k, v] of Object.entries(extra ?? {})) fd.append(k, v);
    try {
      const res = await fetch('/api/v1/my-ads', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(res.status === 404 ? t('notFound') : json.message || tp('errorGeneric'));
        if (!extra) setAd(null);
        return false;
      }
      setAd(json.ad);
      return true;
    } catch {
      setError(tp('errorGeneric'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const statusLabel: Record<string, string> = {
    pending: t('statusPending'),
    approved: t('statusApproved'),
    rejected: t('statusRejected'),
    expired: t('statusExpired'),
    removed: t('statusRemoved'),
    sold: t('statusSold'),
  };
  const date = (s: string | null) => (s ? new Date(s).toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium' }) : '-');
  const inputCls = 'block min-h-[44px] w-full rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-ink-muted">{t('intro')}</p>

      {saved.length > 0 && !ad && (
        <div className="mt-4">
          <p className="text-sm font-semibold">{t('savedAds')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {saved.map((s) => (
              <button
                key={s.reference}
                type="button"
                className="btn-outline"
                dir="ltr"
                onClick={() => {
                  setReference(s.reference);
                  setPhone(s.phone);
                  if (s.key) setKey(s.key);
                  void call(undefined, s.reference, s.phone, s.key ?? key);
                }}
              >
                {s.reference}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        className="card mt-4 grid gap-4 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setNotice('');
          void call();
        }}
      >
        <div>
          <label htmlFor="ref" className="block text-sm font-semibold">
            {t('reference')}
          </label>
          <input id="ref" dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="AO-10001" className={inputCls} required />
        </div>
        <div>
          <label htmlFor="myphone" className="block text-sm font-semibold">
            {t('phone')}
          </label>
          <input id="myphone" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567" className={inputCls} required />
        </div>
        <button type="submit" className="btn-primary" disabled={busy}>
          {t('find')}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {ad && !ad.canManage && (
        <form
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            const k = keyInput.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
            setKey(k);
            await call(undefined, reference, phone, k);
          }}
        >
          <label htmlFor="mkey" className="block font-semibold text-amber-900">{t('keyNeeded')}</label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input id="mkey" dir="ltr" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} maxLength={9} placeholder="ABCD2345" className={`${inputCls} max-w-[12rem] font-mono uppercase`} autoComplete="off" />
            <button type="submit" className="btn-outline" disabled={busy}>{t('keyApply')}</button>
          </div>
          <p className="mt-1 text-xs text-amber-900">{t('keyLost')}</p>
        </form>
      )}
      {notice && (
        <p role="status" className="mt-4 rounded-lg border border-green-200 bg-brand-light p-3 text-sm text-brand-dark">
          {notice}
        </p>
      )}

      {ad && (
        <div className="card mt-4 p-4 md:p-6">
          <div className="flex flex-wrap gap-4">
            {ad.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.coverUrl} alt="" className="h-28 w-28 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-muted" dir="ltr">
                {ad.reference}
              </p>
              <h2 className="text-xl font-bold">{ad.title}</h2>
              <p className="text-sm text-ink-muted">
                {ad.categoryName[locale]} · {ad.cityName[locale]}
                {ad.price ? ` · ${formatPrice(ad.price, locale)}` : ''}
              </p>
              <p className="mt-2">
                <span className="text-sm font-semibold">{t('status')}: </span>
                <span className={`rounded-md px-2 py-0.5 text-sm font-semibold ${STATUS_STYLE[ad.status] ?? ''}`}>{statusLabel[ad.status] ?? ad.status}</span>
              </p>
              {ad.rejectReason && (ad.status === 'rejected' || ad.status === 'removed') && (
                <p className="mt-1 text-sm text-red-800">
                  {t('reason')}: {ad.rejectReason}
                </p>
              )}
              <p className="mt-1 text-sm text-ink-muted">
                {t('posted')}: {date(ad.createdAt)}
                {ad.expiresAt ? ` · ${t('expires')}: ${date(ad.expiresAt)}` : ''}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-6 border-t border-line pt-4">
            {ad.canMarkSold && (
              <button
                type="button"
                className="btn-outline"
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm(t('markSoldConfirm'))) return;
                  if (await call({ action: 'sold' })) setNotice(t('done'));
                }}
              >
                {t('markSold')}
              </button>
            )}

            {ad.upgrade && (ad.upgrade.pending || ad.upgrade.featured !== null || ad.upgrade.boost !== null) && (
              <UpgradeBox ad={ad} locale={locale} methods={paymentMethods} busy={busy} onSubmit={async (extra) => { if (await call(extra)) setNotice(t('done')); }} />
            )}

            {ad.canRenew && (
              <form
                className="rounded-lg bg-page p-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!days) return setError(tp('required'));
                  const extra: Record<string, string | Blob> = { action: 'renew', durationDays: String(days) };
                  if (!ad.renew.free) {
                    if (!method || transactionId.trim().length < 4 || !screenshot) return setError(tp('required'));
                    extra.method = method;
                    extra.transactionId = transactionId.trim();
                    extra.screenshot = screenshot;
                  }
                  if (await call(extra)) setNotice(t('done'));
                }}
              >
                <h3 className="font-bold">{t('renew')}</h3>
                <p className="text-sm text-ink-muted">{t('renewText')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ad.renew.durations.map((d) => (
                    <button
                      key={d.days}
                      type="button"
                      aria-pressed={days === d.days}
                      onClick={() => setDays(d.days)}
                      className={`min-h-[44px] rounded-lg border px-3 text-sm font-semibold ${days === d.days ? 'border-brand bg-brand-light' : 'border-line bg-white'}`}
                    >
                      {d.days} {tp('days')} · {ad.renew.free ? tp('priceFree') : d.price !== null ? formatPrice(d.price, locale) : '-'}
                    </button>
                  ))}
                </div>
                {!ad.renew.free && (
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <label htmlFor="rmethod" className="block text-sm font-semibold">
                        {tp('payMethod')}
                      </label>
                      <select id="rmethod" value={method} onChange={(e) => setMethod(e.target.value as Method)} className={inputCls}>
                        <option value="">{tp('select')}</option>
                        {paymentMethods.map((m) => (
                          <option key={m} value={m}>
                            {METHOD_LABEL[m]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="rtid" className="block text-sm font-semibold">
                        {tp('transactionId')}
                      </label>
                      <input id="rtid" dir="ltr" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="rshot" className="block text-sm font-semibold">
                        {tp('screenshot')}
                      </label>
                      <input id="rshot" type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
                    </div>
                  </div>
                )}
                <button type="submit" className="btn-primary mt-3" disabled={busy}>
                  {t('renew')}
                </button>
              </form>
            )}

            {ad.reviews && (
              <section aria-labelledby="my-reviews">
                <h3 id="my-reviews" className="font-bold">
                  {tr('replyTitle')}
                  {ad.rating && ad.rating.count > 0 ? ` · ${ad.rating.avg.toFixed(1)} ★ (${ad.rating.count})` : ''}
                </h3>
                {ad.reviews.length === 0 && <p className="text-sm text-ink-muted">{tr('noReviews')}</p>}
                <ul className="mt-2 space-y-3">
                  {ad.reviews.map((r) => (
                    <li key={r.id} className="rounded-lg border border-line p-3 text-sm">
                      <p className="font-semibold">
                        {r.name} · {'★'.repeat(r.rating)}
                        <span className="text-gray-300">{'★'.repeat(5 - r.rating)}</span>
                      </p>
                      {r.comment && <p className="mt-1">{r.comment}</p>}
                      {r.reply ? (
                        <p className="mt-2 rounded bg-page p-2">
                          <span className="font-semibold">{tr('reply')}: </span>
                          {r.reply}
                        </p>
                      ) : (
                        <form
                          className="mt-2 flex flex-wrap gap-2"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const text = String(new FormData(e.currentTarget).get('reply') ?? '').trim();
                            if (text.length < 2) return setError(tp('required'));
                            if (await call({ action: 'reply', reviewId: String(r.id), reply: text })) setNotice(t('done'));
                          }}
                        >
                          <label htmlFor={`reply-${r.id}`} className="sr-only">
                            {tr('replyHint')}
                          </label>
                          <input id={`reply-${r.id}`} name="reply" maxLength={500} placeholder={tr('replyHint')} className={`${inputCls} flex-1`} />
                          <button type="submit" className="btn-outline" disabled={busy}>
                            {tr('sendReply')}
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {ad.status !== 'removed' && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (message.trim().length < 3) return setError(tp('required'));
                  if (await call({ action: 'edit', message: message.trim() })) {
                    setMessage('');
                    setNotice(t('done'));
                  }
                }}
              >
                <label htmlFor="msg" className="block font-bold">
                  {t('requestEdit')}
                </label>
                <textarea id="msg" rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('requestEditHint')} className={inputCls} />
                <button type="submit" className="btn-outline mt-2" disabled={busy}>
                  {t('send')}
                </button>
              </form>
            )}

            {ad.referral && <ReferralBox r={ad.referral} locale={locale} />}
          </div>
        </div>
      )}
    </div>
  );
}
