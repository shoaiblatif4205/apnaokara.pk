'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { appendScreenshot, shrinkImage, uploadError } from '@/lib/shrinkImage';
import { Check } from 'lucide-react';
import { formatPrice } from '@apna-okara/shared';
import { PLACEMENT_INFO, type Placement } from '@/lib/bannerConfig';
import type { PaymentAccounts } from '@/lib/meta';
import { Link } from '@/i18n/routing';

type Method = 'jazzcash' | 'easypaisa' | 'nayapay' | 'bank';
const METHOD_LABEL: Record<Method, string> = { jazzcash: 'JazzCash', easypaisa: 'Easypaisa', nayapay: 'NayaPay', bank: 'Bank transfer' };

export function BannerBookingForm({
  locale,
  prices,
  designPrice,
  methods,
  accounts,
  cities,
  categories,
}: {
  locale: 'en' | 'ur';
  prices: { placement: string; days: number; price: number }[];
  designPrice: number | null;
  methods: Method[];
  accounts: PaymentAccounts;
  cities: { id: number; name: string }[];
  categories: { id: number; name: string }[];
}) {
  const t = useTranslations('advertise');
  const tp = useTranslations('post');
  const placements = useMemo(() => [...new Set(prices.map((p) => p.placement))] as Placement[], [prices]);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });

  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [placement, setPlacement] = useState<Placement>(placements[0]);
  const [days, setDays] = useState<number>(prices.find((p) => p.placement === placements[0])?.days ?? 7);
  const [startDate, setStartDate] = useState(today);
  const [link, setLink] = useState('');
  const [cityIds, setCityIds] = useState<number[]>([]);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [platform, setPlatform] = useState<'both' | 'web' | 'app'>('both');
  const [design, setDesign] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [imageDesktop, setImageDesktop] = useState<File | null>(null);
  const [imageMobile, setImageMobile] = useState<File | null>(null);
  const [promo, setPromo] = useState('');
  const [total, setTotal] = useState<number | null>(null);
  const [method, setMethod] = useState<Method | ''>('');
  const [paidFrom, setPaidFrom] = useState('');
  const [shot, setShot] = useState<File | null>(null);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState('');

  const daysFor = prices.filter((p) => p.placement === placement).map((p) => p.days);
  useEffect(() => {
    if (!daysFor.includes(days)) setDays(daysFor[0]);
  }, [placement]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/api/v1/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote: true, placement, days, design, promoCode: promo, phone }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (r.ok) setTotal(j.total);
        else if (j.error === 'promo') setError(j.message);
      })
      .catch(() => {});
  }, [placement, days, design, promo, phone]);

  const toggle = (list: number[], set: (v: number[]) => void, id: number) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const input = 'block min-h-[44px] w-full rounded-lg border border-line bg-white px-3 py-2 text-base';
  const label = 'block text-sm font-semibold';
  const needsPay = (total ?? 1) > 0;

  if (token) {
    const url = `/banner-stats/${token}`;
    return (
      <div className="card mt-6 p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
          <Check size={32} aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-xl font-bold">{t('successTitle')}</h2>
        <p className="mt-2 text-ink-muted">{t('successText')}</p>
        <Link href={url} className="btn-primary mt-4">
          {t('statsLink')}
        </Link>
        <p className="mt-2 break-all text-xs text-ink-muted" dir="ltr">
          {typeof window !== 'undefined' ? `${window.location.origin}/${locale}${url}` : url}
        </p>
      </div>
    );
  }

  return (
    <form
      className="card mt-6 space-y-5 p-4 md:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        if (!imageDesktop && !design) return setError(t('imageRequired'));
        if (needsPay && (!method || !shot)) return setError(tp('required'));
        if (!agree) return setError(tp('required'));
        setBusy(true);
        const fd = new FormData();
        fd.append(
          'data',
          JSON.stringify({
            businessName, contactName, phone, whatsapp, placement, days, startDate, link: link.trim(), cityIds, categoryIds, platform, design,
            title, text, promoCode: promo, payment: needsPay ? { method, paidFrom } : null, agree: true,
          }),
        );
        try {
          // Images are shrunk in the browser first (the server accepts at most 4.5 MB)
          if (imageDesktop) fd.append('imageDesktop', await shrinkImage(imageDesktop, 2400, 0.88));
          if (imageMobile) fd.append('imageMobile', await shrinkImage(imageMobile, 1600, 0.88));
          if (needsPay && shot) await appendScreenshot(fd, shot);
          const res = await fetch('/api/v1/banners', { method: 'POST', body: fd });
          if (res.ok) {
            const j = await res.json();
            setToken(j.statsToken);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else setError(await uploadError(res, tp('errorGeneric'), tp('uploadTooBig')));
        } catch {
          setError(tp('errorGeneric'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-lg font-bold">{t('formTitle')}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="bk-biz" className={label}>{t('businessName')}</label>
          <input id="bk-biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required minLength={2} maxLength={80} className={input} />
        </div>
        <div>
          <label htmlFor="bk-name" className={label}>{t('contactName')}</label>
          <input id="bk-name" value={contactName} onChange={(e) => setContactName(e.target.value)} required minLength={2} maxLength={80} className={input} />
        </div>
        <div>
          <label htmlFor="bk-phone" className={label}>{t('phone')}</label>
          <input id="bk-phone" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="03001234567" className={input} />
        </div>
        <div>
          <label htmlFor="bk-wa" className={label}>{t('whatsapp')}</label>
          <input id="bk-wa" type="tel" dir="ltr" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="03001234567" className={input} />
        </div>
        <div>
          <label htmlFor="bk-place" className={label}>{t('place')}</label>
          <select id="bk-place" value={placement} onChange={(e) => setPlacement(e.target.value as Placement)} className={input}>
            {placements.map((p) => (
              <option key={p} value={p}>
                {PLACEMENT_INFO[p][locale]} ({PLACEMENT_INFO[p].size})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bk-days" className={label}>{t('duration')}</label>
          <select id="bk-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className={input}>
            {daysFor.map((d) => (
              <option key={d} value={d}>
                {t('days', { n: d })} · {formatPrice(prices.find((p) => p.placement === placement && p.days === d)!.price, locale)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bk-start" className={label}>{t('startDate')}</label>
          <input id="bk-start" type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={input} />
        </div>
        <div>
          <label htmlFor="bk-platform" className={label}>{t('platform')}</label>
          <select id="bk-platform" value={platform} onChange={(e) => setPlatform(e.target.value as typeof platform)} className={input}>
            <option value="both">{t('both')}</option>
            <option value="web">{t('web')}</option>
            <option value="app">{t('app')}</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="bk-link" className={label}>{t('link')}</label>
          <input id="bk-link" type="url" dir="ltr" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={input} />
          <p className="mt-1 text-xs text-ink-muted">{t('linkHint')}</p>
        </div>
      </div>

      <fieldset>
        <legend className={label}>{t('cities')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {cities.map((c) => (
            <label key={c.id} className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full border px-3 text-sm ${cityIds.includes(c.id) ? 'border-brand bg-brand-light' : 'border-line'}`}>
              <input type="checkbox" checked={cityIds.includes(c.id)} onChange={() => toggle(cityIds, setCityIds, c.id)} className="accent-brand" />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      {(placement === 'category_top' || placement === 'in_feed') && (
        <fieldset>
          <legend className={label}>{t('categories')}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((c) => (
              <label key={c.id} className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full border px-3 text-sm ${categoryIds.includes(c.id) ? 'border-brand bg-brand-light' : 'border-line'}`}>
                <input type="checkbox" checked={categoryIds.includes(c.id)} onChange={() => toggle(categoryIds, setCategoryIds, c.id)} className="accent-brand" />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="bk-img" className={label}>{t('imageDesktop')}</label>
          <input id="bk-img" type="file" accept="image/*" onChange={(e) => setImageDesktop(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
          <p className="mt-1 text-xs text-ink-muted" dir="ltr">{PLACEMENT_INFO[placement].size}</p>
        </div>
        <div>
          <label htmlFor="bk-img-m" className={label}>{t('imageMobile')}</label>
          <input id="bk-img-m" type="file" accept="image/*" onChange={(e) => setImageMobile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
        </div>
      </div>
      {designPrice !== null && (
        <label className="flex min-h-[44px] items-center gap-2">
          <input type="checkbox" checked={design} onChange={(e) => setDesign(e.target.checked)} className="h-5 w-5 accent-brand" />
          {t('needsDesign', { price: formatPrice(designPrice, locale) })}
        </label>
      )}
      {design && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="bk-title" className={label}>{t('bannerTitle')}</label>
            <input id="bk-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={input} />
          </div>
          <div>
            <label htmlFor="bk-text" className={label}>{t('bannerText')}</label>
            <input id="bk-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={120} className={input} />
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="bk-promo" className={label}>{tp('promoCode')}</label>
          <input id="bk-promo" dir="ltr" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} className={input} />
        </div>
        {total !== null && (
          <p className="self-end text-xl font-bold">
            {tp('total')}: {formatPrice(total, locale)}
          </p>
        )}
      </div>

      {needsPay && (
        <fieldset className="rounded-lg bg-page p-4">
          <legend className="px-1 font-bold">{tp('payTitle')}</legend>
          {methods.length === 0 ? (
            <p className="text-sm text-red-800">{tp('noAccounts')}</p>
          ) : (
            <>
              <p className="text-sm text-ink-muted">{tp('payInstructions')}</p>
              <ul className="mt-2 grid gap-2 md:grid-cols-3" dir="ltr">
                {methods.map((m) => {
                  const lines = m === 'bank' ? [accounts.bank?.bank_name, accounts.bank?.title, accounts.bank?.account, accounts.bank?.iban] : [accounts[m]?.title, accounts[m]?.number];
                  return (
                    <li key={m} className="rounded-lg border border-line bg-white p-3 text-sm">
                      <p className="font-bold">{METHOD_LABEL[m]}</p>
                      {lines.filter(Boolean).map((l) => (
                        <p key={l}>{l}</p>
                      ))}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor="bk-method" className={label}>{tp('payMethod')}</label>
                  <select id="bk-method" value={method} onChange={(e) => setMethod(e.target.value as Method)} className={input}>
                    <option value="">{tp('select')}</option>
                    {methods.map((m) => (
                      <option key={m} value={m}>
                        {METHOD_LABEL[m]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bk-from" className={label}>{tp('paidFrom')}</label>
                  <input id="bk-from" value={paidFrom} onChange={(e) => setPaidFrom(e.target.value)} className={input} />
                </div>
                <div>
                  <label htmlFor="bk-shot" className={label}>{tp('screenshot')}</label>
                  <input id="bk-shot" type="file" accept="image/*" onChange={(e) => setShot(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
                </div>
              </div>
            </>
          )}
        </fieldset>
      )}

      <label htmlFor="bk-agree" className="flex min-h-[44px] items-center gap-2 text-sm">
        <input id="bk-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-5 w-5 accent-brand" />
        {tp('agree')}
      </label>
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <button type="submit" className="btn-accent" disabled={busy}>
        {busy ? tp('submitting') : t('submit')}
      </button>
    </form>
  );
}
