'use client';

import { useEffect, useMemo, useState } from 'react';
import { shrinkImage, shrinkImages, uploadError } from '@/lib/shrinkImage';
import { useTranslations } from 'next-intl';
import { Camera, Check, ImagePlus, MessageCircle, X } from 'lucide-react';
import {
  durationsFor,
  formatPrice,
  isFreeNow,
  isProviderModel,
  isValidPakMobile,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  minPhotos,
  models,
  priceFor,
} from '@apna-okara/shared';
import type { Meta } from '@/lib/meta';
import { Link } from '@/i18n/routing';
import { CategoryIcon } from '@/components/CategoryIcon';

type Props = {
  meta: Meta & { paymentMethods: ('jazzcash' | 'easypaisa' | 'nayapay' | 'bank')[] };
  locale: 'en' | 'ur';
  initialModel?: string;
  /** From an invite link: /post-ad?ref=AOXXXXX */
  initialReferral?: string;
  /** WhatsApp group / channel link (Site settings), shown after posting */
  communityLink?: string | null;
};
type Named = { name_en: string; name_ur: string };
type Photo = { file: File; url: string };

const STEP_KEYS = ['stepCategory', 'stepDetails', 'stepPhotos', 'stepContact', 'stepPlan'] as const;
const METHOD_LABEL = { jazzcash: 'JazzCash', easypaisa: 'Easypaisa', nayapay: 'NayaPay', bank: 'Bank transfer' };

export function PostAdForm({ meta, locale, initialModel, initialReferral, communityLink }: Props) {
  const t = useTranslations('post');
  const n = (o: Named) => (locale === 'ur' ? o.name_ur : o.name_en);
  const label = (o: { label_en: string; label_ur: string }) => (locale === 'ur' ? o.label_ur : o.label_en);

  const [step, setStep] = useState(0);
  const [model, setModel] = useState(models.some((m) => m.key === initialModel) ? initialModel! : 'buy_sell');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceType, setPriceType] = useState<'fixed' | 'negotiable' | 'contact' | 'free'>('fixed');
  const [price, setPrice] = useState('');
  const [cityId, setCityId] = useState<number | null>(null);
  const [localityId, setLocalityId] = useState<number | null>(null);
  const [fields, setFields] = useState<Record<string, string | boolean>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sellerName, setSellerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showPhone, setShowPhone] = useState(true);
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [method, setMethod] = useState<'jazzcash' | 'easypaisa' | 'nayapay' | 'bank' | ''>('');
  const [paidFrom, setPaidFrom] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [agree, setAgree] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [boost, setBoost] = useState(false);
  const [referral, setReferral] = useState((initialReferral ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12));
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState('');
  const [promoError, setPromoError] = useState('');
  const [quote, setQuote] = useState<{ total: number; subtotal: number; discount: number; items: { key: string; label: string; amount: number }[] } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [reference, setReference] = useState('');
  const [manageKey, setManageKey] = useState('');

  const category = meta.categories.find((c) => c.id === categoryId) ?? null;
  const city = meta.cities.find((c) => c.id === cityId) ?? null;
  const free = category ? isFreeNow(meta.freeMode, category.model, category.slug) : false;
  const durations = useMemo(() => {
    if (!category) return [];
    if (free) return [{ days: meta.freeMode?.days_by_model[category.model] ?? 30, price: 0 }];
    return durationsFor(category.model).map((d) => ({ days: d, price: priceFor(meta.pricing, category.model, category.id, d) }));
  }, [category, free, meta]);
  // Ask the server for the exact total (plan + add-ons - promo)
  useEffect(() => {
    if (step !== 4 || !category || !durationDays) return;
    let cancelled = false;
    fetch('/api/v1/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: category.id, days: durationDays, featured, boost, promoCode: promo, phone }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (cancelled) return;
        if (r.ok) {
          setQuote(j);
          setPromoError('');
        } else if (j.error === 'promo') {
          setPromoError(j.message);
          setPromo('');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [step, category, durationDays, featured, boost, promo, phone]);
  const needsPayment = quote ? quote.total > 0 : !free || featured || boost;

  useEffect(() => {
    if (durations.length === 1) setDurationDays(durations[0].days);
    else if (durationDays && !durations.some((d) => d.days === durationDays)) setDurationDays(null);
  }, [durations, durationDays]);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function validate(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!category) e.category = t('required');
      else if (category.subcategories.length && !subcategoryId) e.subcategory = t('required');
    }
    if (s === 1 && category) {
      if (title.trim().length < 5) e.title = t('required');
      if ((priceType === 'fixed' || priceType === 'negotiable') && !(Number(price) > 0)) e.price = t('required');
      if (!cityId) e.city = t('required');
      for (const f of category.fields) {
        if (f.is_required && f.type !== 'boolean' && (fields[f.key] === undefined || fields[f.key] === '')) e[`f_${f.key}`] = t('required');
      }
    }
    if (s === 2 && category && photos.length < minPhotos(category.model)) e.photos = t('photosRequired');
    if (s === 3) {
      if (sellerName.trim().length < 2) e.sellerName = t('required');
      if (!isValidPakMobile(phone)) e.phone = t('invalidPhone');
      if (whatsapp && !isValidPakMobile(whatsapp)) e.whatsapp = t('invalidPhone');
    }
    if (s === 4) {
      if (!durationDays) e.duration = t('required');
      if (needsPayment) {
        if (!method) e.method = t('required');
        if (!screenshot) e.screenshot = t('required');
      }
      if (!agree) e.agree = t('required');
    }
    return e;
  }

  function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep((s) => Math.min(4, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(list).slice(0, room);
    if (picked.some((f) => f.size > MAX_PHOTO_BYTES)) {
      setErrors((e) => ({ ...e, photos: t('photoTooBig') }));
      return;
    }
    setPhotos((p) => [...p, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    setErrors((e) => ({ ...e, photos: '' }));
  }

  async function submit() {
    const e = validate(4);
    setErrors(e);
    if (Object.keys(e).length || !category) return;
    setSubmitting(true);
    setServerError('');
    const data = {
      categoryId: category.id,
      subcategoryId,
      title: title.trim(),
      description: description.trim(),
      priceType,
      price: priceType === 'fixed' || priceType === 'negotiable' ? Number(price) : null,
      cityId,
      localityId,
      fields,
      sellerName: sellerName.trim(),
      phone,
      whatsapp,
      showPhone,
      durationDays,
      featured,
      boost,
      promoCode: promo,
      payment: needsPayment ? { method, paidFrom: paidFrom.trim() } : null,
      agree: true,
      locale,
    };
    const fd = new FormData();
    fd.append('data', JSON.stringify(data));
    try {
      // Shrink photos in the browser first (the server accepts at most 4.5 MB in total)
      for (const p of await shrinkImages(photos.map((x) => x.file))) fd.append('photos', p);
      if (needsPayment && screenshot) fd.append('screenshot', await shrinkImage(screenshot));
      const res = await fetch('/api/v1/listings', { method: 'POST', body: fd });
      if (!res.ok) {
        setServerError(await uploadError(res, t('errorGeneric'), t('uploadTooBig')));
      } else {
        const json = await res.json();
        setManageKey(json.manageKey ?? '');
      setReference(json.reference);
        try {
          const saved = JSON.parse(localStorage.getItem('ao.myAds') || '[]') as { reference: string; phone: string; key?: string }[];
          localStorage.setItem('ao.myAds', JSON.stringify([{ reference: json.reference, phone, key: json.manageKey }, ...saved].slice(0, 20)));
        } catch {
          /* storage not available */
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setServerError(t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  const err = (k: string) =>
    errors[k] ? (
      <p className="mt-1 text-sm text-red-700" role="alert">
        {errors[k]}
      </p>
    ) : null;
  const inputCls = 'block min-h-[44px] w-full rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';
  const labelCls = 'block text-sm font-semibold';
  const choice = (active: boolean) =>
    `flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
      active ? 'border-brand bg-brand-light text-brand-dark' : 'border-line bg-white hover:border-brand'
    }`;

  // ---------- success ----------
  if (reference) {
    // Private link: includes the secret code (needed to mark sold). Shared only with the seller themselves.
    const statusUrl = `${window.location.origin}/${locale}/my-ad?ref=${reference}${manageKey ? `&key=${manageKey}` : ''}`;
    const shareText = `Apna Okara: ${t('reference')} ${reference}${manageKey ? `\n${t('manageKey')}: ${manageKey} (${t('keepPrivate')})` : ''}\n${statusUrl}`;
    return (
      <div className="card p-6 text-center md:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
          <Check size={32} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">{t('successTitle')}</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-muted">{t('successText')}</p>
        <p className="mt-6 text-sm font-semibold text-ink-muted">{t('reference')}</p>
        <p className="mt-1 text-3xl font-extrabold tracking-wider text-brand" dir="ltr">
          {reference}
        </p>
        {manageKey && (
          <div className="mx-auto mt-5 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-start">
            <p className="text-sm font-bold text-amber-900">{t('manageKey')}</p>
            <p className="mt-1 text-2xl font-extrabold tracking-[0.3em] text-ink" dir="ltr">{manageKey}</p>
            <p className="mt-1 text-xs text-amber-900">{t('manageKeyText')}</p>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <MessageCircle size={18} aria-hidden="true" /> {t('shareRef')}
          </a>
          <Link href={`/my-ad?ref=${reference}${manageKey ? `&key=${manageKey}` : ''}`} className="btn-outline">
            {t('checkStatus')}
          </Link>
          <button type="button" className="btn-outline" onClick={() => window.location.reload()}>
            {t('postAnother')}
          </button>
        </div>
        {communityLink && (
          <div className="mx-auto mt-8 max-w-md rounded-xl bg-[#E7F8EE] p-4">
            <p className="text-sm font-semibold text-[#14532D]">{t('joinCommunity')}</p>
            <a href={communityLink} target="_blank" rel="noopener noreferrer" className="btn mt-3 bg-[#1FAF5A] text-white hover:bg-[#178A47]">
              <MessageCircle size={18} aria-hidden="true" /> {t('joinCommunityBtn')}
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <ol className="mt-4 flex gap-1 overflow-x-auto" aria-label={t('title')}>
        {STEP_KEYS.map((k, i) => (
          <li
            key={k}
            aria-current={i === step ? 'step' : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-sm ${
              i === step ? 'bg-brand text-white' : i < step ? 'bg-brand-light text-brand-dark' : 'bg-white text-ink-muted'
            }`}
          >
            <span className="font-bold">{i + 1}</span> {t(k)}
          </li>
        ))}
      </ol>

      <div className="card mt-4 p-4 md:p-6">
        {/* ---------- Step 1: category ---------- */}
        {step === 0 && (
          <div className="space-y-6">
            <fieldset>
              <legend className={labelCls}>{t('chooseType')}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                {models.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    aria-pressed={model === m.key}
                    className={choice(model === m.key)}
                    onClick={() => {
                      setModel(m.key);
                      setCategoryId(null);
                      setSubcategoryId(null);
                    }}
                  >
                    {m.name[locale]}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className={labelCls}>{t('chooseCategory')}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                {meta.categories
                  .filter((c) => c.model === model)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={categoryId === c.id}
                      className={`${choice(categoryId === c.id)} flex-col py-3`}
                      onClick={() => {
                        setCategoryId(c.id);
                        setSubcategoryId(null);
                        setFields({});
                      }}
                    >
                      <CategoryIcon icon={(c.icon ?? 'other') as never} size={26} className="text-brand" />
                      {n(c)}
                    </button>
                  ))}
              </div>
              {err('category')}
            </fieldset>
            {category && category.subcategories.length > 0 && (
              <fieldset>
                <legend className={labelCls}>{t('chooseSubcategory')}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {category.subcategories.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={subcategoryId === s.id}
                      className={choice(subcategoryId === s.id)}
                      onClick={() => setSubcategoryId(s.id)}
                    >
                      {n(s)}
                    </button>
                  ))}
                </div>
                {err('subcategory')}
              </fieldset>
            )}
          </div>
        )}

        {/* ---------- Step 2: details ---------- */}
        {step === 1 && category && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="title" className={labelCls}>
                {t('adTitle')}
              </label>
              <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={t('adTitleHint')} className={inputCls} />
              {err('title')}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="description" className={labelCls}>
                {t('description')}
              </label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={5000} placeholder={t('descriptionHint')} className={inputCls} />
            </div>

            {category.fields.length > 0 && <h2 className="font-bold md:col-span-2">{t('fieldsTitle')}</h2>}
            {category.fields.map((f) => {
              const id = `f_${f.key}`;
              const unit = locale === 'ur' ? f.unit_ur : f.unit_en;
              const v = fields[f.key];
              return (
                <div key={f.key}>
                  {f.type === 'boolean' ? (
                    <label htmlFor={id} className="mt-6 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold">
                      <input id={id} type="checkbox" checked={v === true} onChange={(e) => setFields({ ...fields, [f.key]: e.target.checked })} className="h-5 w-5 accent-brand" />
                      {label(f)}
                    </label>
                  ) : (
                    <>
                      <label htmlFor={id} className={labelCls}>
                        {label(f)}
                        {unit ? ` (${unit})` : ''}
                        {f.is_required ? ' *' : ''}
                      </label>
                      {f.type === 'select' ? (
                        <select id={id} value={String(v ?? '')} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} className={inputCls}>
                          <option value="">{t('select')}</option>
                          {f.options?.map((o) => (
                            <option key={o.en} value={o.en}>
                              {locale === 'ur' ? o.ur : o.en}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={id}
                          type={f.type === 'text' ? 'text' : 'number'}
                          inputMode={f.type === 'text' ? undefined : 'numeric'}
                          min={0}
                          value={String(v ?? '')}
                          onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
                          className={inputCls}
                        />
                      )}
                    </>
                  )}
                  {err(id)}
                </div>
              );
            })}

            <div>
              <label htmlFor="priceType" className={labelCls}>
                {t('priceType')}
              </label>
              <select id="priceType" value={priceType} onChange={(e) => setPriceType(e.target.value as typeof priceType)} className={inputCls}>
                <option value="fixed">{t('priceFixed')}</option>
                <option value="negotiable">{t('priceNegotiable')}</option>
                <option value="contact">{t('priceContact')}</option>
                {!isProviderModel(category.model) && <option value="free">{t('priceFree')}</option>}
              </select>
            </div>
            {(priceType === 'fixed' || priceType === 'negotiable') && (
              <div>
                <label htmlFor="price" className={labelCls}>
                  {t('price')}
                </label>
                <input id="price" type="number" inputMode="numeric" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
                {err('price')}
              </div>
            )}

            <div>
              <label htmlFor="ad-city" className={labelCls}>
                {t('city')}
              </label>
              <select
                id="ad-city"
                value={cityId ?? ''}
                onChange={(e) => {
                  setCityId(e.target.value ? Number(e.target.value) : null);
                  setLocalityId(null);
                }}
                className={inputCls}
              >
                <option value="">{t('select')}</option>
                {meta.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {n(c)}
                  </option>
                ))}
              </select>
              {err('city')}
            </div>
            {city && city.localities.length > 0 && (
              <div>
                <label htmlFor="ad-locality" className={labelCls}>
                  {t('locality')}
                </label>
                <select id="ad-locality" value={localityId ?? ''} onChange={(e) => setLocalityId(e.target.value ? Number(e.target.value) : null)} className={inputCls}>
                  <option value="">{t('select')}</option>
                  {city.localities.map((l) => (
                    <option key={l.id} value={l.id}>
                      {n(l)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ---------- Step 3: photos ---------- */}
        {step === 2 && (
          <div>
            <p className="text-sm text-ink-muted">{t('photosHint')}</p>
            <ul className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-4">
              {photos.map((p, i) => (
                <li key={p.url} className="relative aspect-square overflow-hidden rounded-lg border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute start-1 top-1 rounded bg-brand px-2 text-xs text-white">1</span>}
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(p.url);
                      setPhotos(photos.filter((x) => x !== p));
                    }}
                    className="absolute end-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-700"
                    aria-label={t('removePhoto')}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </li>
              ))}
              {photos.length < MAX_PHOTOS && (
                <li>
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-brand text-center text-sm font-semibold text-brand hover:bg-brand-light">
                    <ImagePlus size={28} aria-hidden="true" />
                    {t('addPhotos')}
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
                  </label>
                </li>
              )}
              {photos.length < MAX_PHOTOS && (
                <li className="md:hidden">
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-center text-sm font-semibold text-ink-muted">
                    <Camera size={28} aria-hidden="true" />
                    {t('takePhoto')}
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
                  </label>
                </li>
              )}
            </ul>
            <p className="mt-2 text-sm text-ink-muted">
              {photos.length} / {MAX_PHOTOS}
            </p>
            {err('photos')}
          </div>
        )}

        {/* ---------- Step 4: contact ---------- */}
        {step === 3 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="sellerName" className={labelCls}>
                {t('yourName')}
              </label>
              <input id="sellerName" value={sellerName} onChange={(e) => setSellerName(e.target.value)} autoComplete="name" className={inputCls} />
              {err('sellerName')}
            </div>
            <div>
              <label htmlFor="phone" className={labelCls}>
                {t('phone')}
              </label>
              <input id="phone" type="tel" inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="03001234567" className={inputCls} />
              <p className="mt-1 text-xs text-ink-muted">{t('phoneHint')}</p>
              {err('phone')}
            </div>
            <div>
              <label htmlFor="whatsapp" className={labelCls}>
                {t('whatsapp')}
              </label>
              <input id="whatsapp" type="tel" inputMode="tel" dir="ltr" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="03001234567" className={inputCls} />
              <p className="mt-1 text-xs text-ink-muted">{t('whatsappHint')}</p>
              {err('whatsapp')}
            </div>
            <label htmlFor="showPhone" className="inline-flex min-h-[44px] items-center gap-2 text-sm md:col-span-2">
              <input id="showPhone" type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} className="h-5 w-5 accent-brand" />
              {t('showPhone')}
            </label>
          </div>
        )}

        {/* ---------- Step 5: plan, payment, submit ---------- */}
        {step === 4 && category && (
          <div className="space-y-6">
            <fieldset>
              <legend className={labelCls}>{t('duration')}</legend>
              {free && <p className="mt-1 inline-block rounded-md bg-brand-light px-2 py-1 text-sm font-semibold text-brand-dark">{t('freeNow')}</p>}
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                {durations.map((d) => (
                  <button
                    key={d.days}
                    type="button"
                    aria-pressed={durationDays === d.days}
                    className={`${choice(durationDays === d.days)} flex-col py-3`}
                    onClick={() => setDurationDays(d.days)}
                  >
                    <span>{isProviderModel(category.model) ? t('twoMonths') : `${d.days} ${t('days')}`}</span>
                    <span className="text-xs font-normal">{free ? t('priceFree') : d.price !== null ? formatPrice(d.price, locale) : '-'}</span>
                  </button>
                ))}
              </div>
              {err('duration')}
            </fieldset>

            {meta.addons.length > 0 && (
              <fieldset>
                <legend className={labelCls}>{t('addonsTitle')}</legend>
                <div className="mt-2 grid gap-2">
                  {meta.addons.map((a) => {
                    const on = a.key === 'featured' ? featured : boost;
                    return (
                      <label key={a.key} htmlFor={`addon-${a.key}`} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${on ? 'border-accent bg-accent-light' : 'border-line bg-white'}`}>
                        <input
                          id={`addon-${a.key}`}
                          type="checkbox"
                          checked={on}
                          onChange={(e) => (a.key === 'featured' ? setFeatured(e.target.checked) : setBoost(e.target.checked))}
                          className="mt-1 h-5 w-5 accent-accent"
                        />
                        <span>
                          <span className="font-bold">
                            {locale === 'ur' ? a.name_ur : a.name_en} · +{formatPrice(a.price, locale)}
                          </span>
                          <span className="block text-sm text-ink-muted">{a.key === 'featured' ? t('featuredInfo') : t('boostInfo')}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {(needsPayment || promo) && (
              <div>
                <label htmlFor="promo" className={labelCls}>
                  {t('promoCode')}
                </label>
                <div className="mt-1 flex gap-2">
                  <input id="promo" dir="ltr" value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} maxLength={30} className={`${inputCls} max-w-xs`} />
                  <button type="button" className="btn-outline" onClick={() => setPromo(promoInput.trim())}>
                    {t('apply')}
                  </button>
                </div>
                {promo && !promoError && quote && quote.discount > 0 && <p className="mt-1 text-sm text-brand-dark">{t('promoApplied')}</p>}
                {promoError && (
                  <p className="mt-1 text-sm text-red-700" role="alert">
                    {promoError}
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="referral" className={labelCls}>
                {t('referralCode')}
              </label>
              <input
                id="referral"
                dir="ltr"
                value={referral}
                onChange={(e) => setReferral(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
                className={`${inputCls} max-w-xs`}
                aria-describedby="referral-hint"
              />
              <p id="referral-hint" className="mt-1 text-xs text-ink-muted">{t('referralHint')}</p>
            </div>

            {needsPayment && (
              <fieldset className="rounded-lg bg-page p-4">
                <legend className="px-1 font-bold">{t('payTitle')}</legend>
                {quote && (
                  <dl className="space-y-1 text-sm">
                    {quote.items.map((i) => (
                      <div key={i.key} className="flex justify-between gap-4">
                        <dt>{i.key === 'plan' ? `${t('plan')}: ${durationDays} ${t('days')}` : meta.addons.find((a) => a.key === i.key)?.[locale === 'ur' ? 'name_ur' : 'name_en'] ?? i.label}</dt>
                        <dd>{formatPrice(i.amount, locale)}</dd>
                      </div>
                    ))}
                    {quote.discount > 0 && (
                      <div className="flex justify-between gap-4 text-brand-dark">
                        <dt>{t('discount')}</dt>
                        <dd>-{formatPrice(quote.discount, locale)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-4 border-t border-line pt-1 text-lg font-bold">
                      <dt>{t('total')}</dt>
                      <dd>{formatPrice(quote.total, locale)}</dd>
                    </div>
                  </dl>
                )}
                {meta.paymentMethods.length === 0 ? (
                  <p className="mt-2 text-sm text-red-800">{t('noAccounts')}</p>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-ink-muted">{t('payInstructions')}</p>
                    <ul className="mt-3 grid gap-2 md:grid-cols-3" dir="ltr">
                      {meta.paymentMethods.map((m) => {
                        const acc = meta.paymentAccounts;
                        const lines =
                          m === 'bank'
                            ? [acc.bank?.bank_name, acc.bank?.title, acc.bank?.account, acc.bank?.iban]
                            : [acc[m]?.title, acc[m]?.number];
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
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="method" className={labelCls}>
                          {t('payMethod')}
                        </label>
                        <select id="method" value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className={inputCls}>
                          <option value="">{t('select')}</option>
                          {meta.paymentMethods.map((m) => (
                            <option key={m} value={m}>
                              {METHOD_LABEL[m]}
                            </option>
                          ))}
                        </select>
                        {err('method')}
                      </div>
                      <div>
                        <label htmlFor="paidFrom" className={labelCls}>
                          {t('paidFrom')}
                        </label>
                        <input id="paidFrom" value={paidFrom} onChange={(e) => setPaidFrom(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label htmlFor="screenshot" className={labelCls}>
                          {t('screenshot')}
                        </label>
                        <input
                          id="screenshot"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                          className="mt-1 block w-full text-sm"
                        />
                        {err('screenshot')}
                      </div>
                    </div>
                  </>
                )}
              </fieldset>
            )}

            <div>
              <label htmlFor="agree" className="inline-flex min-h-[44px] items-center gap-2 text-sm">
                <input id="agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-5 w-5 accent-brand" />
                <span>
                  {t('agree')} (
                  <Link href="/terms" className="text-brand underline" target="_blank">
                    Terms
                  </Link>
                  ,{' '}
                  <Link href="/posting-rules" className="text-brand underline" target="_blank">
                    Rules
                  </Link>
                  )
                </span>
              </label>
              {err('agree')}
            </div>
            {serverError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {serverError}
              </p>
            )}
          </div>
        )}

        {/* ---------- navigation ---------- */}
        <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-line pt-4">
          {step > 0 ? (
            <button type="button" className="btn-outline" onClick={() => setStep((s) => s - 1)}>
              {t('back')}
            </button>
          ) : (
            <span />
          )}
          {step < 4 ? (
            <button type="button" className="btn-primary" onClick={next}>
              {t('next')}
            </button>
          ) : (
            <button type="button" className="btn-accent" onClick={submit} aria-disabled={submitting} disabled={submitting}>
              {submitting ? t('submitting') : t('submit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
