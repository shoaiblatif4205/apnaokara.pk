'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { appendScreenshot, shrinkImages, uploadError } from '@/lib/shrinkImage';
import { useTranslations } from 'next-intl';
import { Camera, Check, ImagePlus, MessageCircle, X } from 'lucide-react';
import {
  durationsFor,
  formatPrice,
  isFreeNow,
  isProviderModel,
  isValidPakMobile,
  MAX_PHOTOS,
  minPhotos,
  models,
  priceFor,
} from '@apna-okara/shared';
import type { Meta } from '@/lib/meta';
import { Link } from '@/i18n/routing';

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

const METHOD_LABEL = { jazzcash: 'JazzCash', easypaisa: 'Easypaisa', nayapay: 'NayaPay', bank: 'Bank transfer' };

// One simple page: category, details, photos, contact, plan + payment, one Submit button.
export function PostAdForm({ meta, locale, initialModel, initialReferral, communityLink }: Props) {
  const t = useTranslations('post');
  const n = (o: Named) => (locale === 'ur' ? o.name_ur : o.name_en);
  const label = (o: { label_en: string; label_ur: string }) => (locale === 'ur' ? o.label_ur : o.label_en);

  // From "List your service" style links (?model=services): pick the category if that type has only one
  const startCategory = useMemo(() => {
    const list = meta.categories.filter((c) => c.model === initialModel);
    return list.length === 1 ? list[0].id : null;
  }, [meta.categories, initialModel]);

  const [categoryId, setCategoryId] = useState<number | null>(startCategory);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [cityId, setCityId] = useState<number | null>(null);
  const [localityId, setLocalityId] = useState<number | null>(null);
  const [fields, setFields] = useState<Record<string, string | boolean>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sellerName, setSellerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showPhone, setShowPhone] = useState(true);
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [method, setMethod] = useState<'jazzcash' | 'easypaisa' | 'nayapay' | 'bank' | ''>(meta.paymentMethods.length === 1 ? meta.paymentMethods[0] : '');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [featured, setFeatured] = useState(false);
  const [boost, setBoost] = useState(false);
  const [referral, setReferral] = useState((initialReferral ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12));
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState('');
  const [promoError, setPromoError] = useState('');
  const [quote, setQuote] = useState<{ total: number; subtotal: number; discount: number; items: { key: string; label: string; amount: number }[] } | null>(null);
  // After the first Submit, messages update live as the person fixes each field
  const [tried, setTried] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [reference, setReference] = useState('');
  const [manageKey, setManageKey] = useState('');

  const category = meta.categories.find((c) => c.id === categoryId) ?? null;
  const city = meta.cities.find((c) => c.id === cityId) ?? null;
  const free = category ? isFreeNow(meta.freeMode, category.model, category.slug) : false;
  const provider = category ? isProviderModel(category.model) : false;
  const requiredFields = category ? category.fields.filter((f) => f.is_required && f.type !== 'boolean') : [];
  const optionalFields = category ? category.fields.filter((f) => !(f.is_required && f.type !== 'boolean')) : [];
  const durations = useMemo(() => {
    if (!category) return [];
    if (free) return [{ days: meta.freeMode?.days_by_model[category.model] ?? 30, price: 0 }];
    return durationsFor(category.model).map((d) => ({ days: d, price: priceFor(meta.pricing, category.model, category.id, d) }));
  }, [category, free, meta]);

  // Always have a plan picked (the cheapest), so people only change it if they want to
  useEffect(() => {
    if (!durations.length) setDurationDays(null);
    else if (!durationDays || !durations.some((d) => d.days === durationDays)) setDurationDays(durations[0].days);
  }, [durations, durationDays]);

  // Ask the server for the exact total (plan + add-ons - promo)
  useEffect(() => {
    if (!category || !durationDays) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    fetch('/api/v1/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: category.id, days: durationDays, featured, boost, promoCode: promo, phone }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (cancelled) return;
        if (r.ok) setQuote(j);
        else if (j.error === 'promo') {
          // Keep the message on screen; the code is dropped and the price is asked again without it
          setPromoError(j.message);
          setPromo('');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [category, durationDays, featured, boost, promo, phone]);
  const needsPayment = quote ? quote.total > 0 : !free || featured || boost;

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!category) e.category = t('required');
    else if (category.subcategories.length && !subcategoryId) e.subcategory = t('required');
    if (title.trim().length < 5) e.title = t('titleShort');
    if (price && !(Number(price) > 0)) e.price = t('required');
    if (!cityId) e.city = t('required');
    for (const f of requiredFields) {
      if (fields[f.key] === undefined || fields[f.key] === '') e[`f_${f.key}`] = t('required');
    }
    if (category && photos.length < minPhotos(category.model)) e.photos = t('photosRequired');
    if (sellerName.trim().length < 2) e.sellerName = t('required');
    if (!isValidPakMobile(phone)) e.phone = t('invalidPhone');
    if (whatsapp && !isValidPakMobile(whatsapp)) e.whatsapp = t('invalidPhone');
    if (category && !durationDays) e.duration = t('required');
    if (category && needsPayment && meta.paymentMethods.length) {
      if (!method) e.method = t('required');
      if (!screenshot) e.screenshot = t('required');
    }
    return e;
  }

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const room = MAX_PHOTOS - photos.length;
    // Any size is fine: photos are shrunk in the browser before upload. Only non-images are refused.
    const picked = Array.from(list)
      .filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name))
      .slice(0, room);
    setPhotos((p) => [...p, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  async function submit() {
    const e = validate();
    setTried(true);
    if (Object.keys(e).length || !category) {
      // Take the person straight to the first thing to fix
      setTimeout(() => document.querySelector('[data-error="1"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    setSubmitting(true);
    setServerError('');
    const hasPrice = Number(price) > 0;
    const data = {
      categoryId: category.id,
      subcategoryId,
      title: title.trim(),
      description: description.trim(),
      priceType: hasPrice ? (negotiable ? 'negotiable' : 'fixed') : 'contact',
      price: hasPrice ? Number(price) : null,
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
      referralCode: referral,
      payment: needsPayment ? { method, paidFrom: '' } : null,
      agree: true,
      locale,
    };
    const fd = new FormData();
    fd.append('data', JSON.stringify(data));
    try {
      // Shrink photos in the browser first (the server accepts at most 4.5 MB in total)
      for (const p of await shrinkImages(photos.map((x) => x.file))) fd.append('photos', p);
      if (needsPayment && screenshot) await appendScreenshot(fd, screenshot);
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

  const errors = tried ? validate() : {};
  const err = (k: string) =>
    errors[k] ? (
      <p className="mt-1 text-sm text-red-700" role="alert" data-error="1">
        {errors[k]}
      </p>
    ) : null;
  const inputCls = 'block min-h-[44px] w-full rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';
  const labelCls = 'block text-sm font-semibold';
  const optional = <span className="font-normal text-ink-muted"> ({t('optional')})</span>;
  const choice = (active: boolean) =>
    `flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
      active ? 'border-brand bg-brand-light text-brand-dark' : 'border-line bg-white hover:border-brand'
    }`;
  const section = (num: number, heading: string, children: ReactNode) => (
    <section className="border-b border-line pb-6 last:border-0 last:pb-0">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm text-white">{num}</span>
        {heading}
      </h2>
      {children}
    </section>
  );

  function fieldInput(f: (typeof optionalFields)[number]) {
    const id = `f_${f.key}`;
    const unit = locale === 'ur' ? f.unit_ur : f.unit_en;
    const v = fields[f.key];
    return (
      <div key={f.key}>
        {f.type === 'boolean' ? (
          <label htmlFor={id} className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold">
            <input id={id} type="checkbox" checked={v === true} onChange={(e) => setFields({ ...fields, [f.key]: e.target.checked })} className="h-5 w-5 accent-brand" />
            {label(f)}
          </label>
        ) : (
          <>
            <label htmlFor={id} className={labelCls}>
              {label(f)}
              {unit ? ` (${unit})` : ''}
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
  }

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
      <p className="mt-1 text-sm text-ink-muted">{t('onePageHint')}</p>

      <div className="card mt-4 space-y-6 p-4 md:p-6">
        {/* ---------- 1. category ---------- */}
        {section(
          1,
          t('stepCategory'),
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="category" className={labelCls}>
                {t('chooseCategory')}
              </label>
              <select
                id="category"
                value={categoryId ?? ''}
                onChange={(e) => {
                  setCategoryId(e.target.value ? Number(e.target.value) : null);
                  setSubcategoryId(null);
                  setFields({});
                }}
                className={inputCls}
              >
                <option value="">{t('select')}</option>
                {models.map((m) => {
                  const cats = meta.categories.filter((c) => c.model === m.key);
                  if (!cats.length) return null;
                  return (
                    <optgroup key={m.key} label={m.name[locale]}>
                      {cats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {n(c)}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              {err('category')}
            </div>
            {category && category.subcategories.length > 0 && (
              <div>
                <label htmlFor="subcategory" className={labelCls}>
                  {t('chooseSubcategory')}
                </label>
                <select id="subcategory" value={subcategoryId ?? ''} onChange={(e) => setSubcategoryId(e.target.value ? Number(e.target.value) : null)} className={inputCls}>
                  <option value="">{t('select')}</option>
                  {category.subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {n(s)}
                    </option>
                  ))}
                </select>
                {err('subcategory')}
              </div>
            )}
          </div>,
        )}

        {/* ---------- 2. details ---------- */}
        {section(
          2,
          t('stepDetails'),
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="title" className={labelCls}>
                {t('adTitle')}
              </label>
              <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={t('adTitleHint')} className={inputCls} />
              {err('title')}
            </div>
            <div>
              <label htmlFor="price" className={labelCls}>
                {t('price')}
                {optional}
              </label>
              <input id="price" type="number" inputMode="numeric" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
              <p className="mt-1 text-xs text-ink-muted">{t('priceEmptyHint')}</p>
              {price && (
                <label htmlFor="negotiable" className="mt-1 inline-flex min-h-[36px] items-center gap-2 text-sm">
                  <input id="negotiable" type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} className="h-5 w-5 accent-brand" />
                  {t('priceNegotiable')}
                </label>
              )}
              {err('price')}
            </div>
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
              {city && city.localities.length > 0 && (
                <select
                  id="ad-locality"
                  aria-label={t('locality')}
                  value={localityId ?? ''}
                  onChange={(e) => setLocalityId(e.target.value ? Number(e.target.value) : null)}
                  className={`${inputCls} mt-2`}
                >
                  <option value="">
                    {t('locality')} ({t('optional')})
                  </option>
                  {city.localities.map((l) => (
                    <option key={l.id} value={l.id}>
                      {n(l)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {requiredFields.map(fieldInput)}
            <div className="md:col-span-2">
              <label htmlFor="description" className={labelCls}>
                {t('description')}
                {optional}
              </label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={5000} placeholder={t('descriptionHint')} className={inputCls} />
            </div>
            {optionalFields.length > 0 && (
              <details className="rounded-lg border border-line p-3 md:col-span-2">
                <summary className="cursor-pointer text-sm font-semibold text-brand">{t('moreDetailsOptional')}</summary>
                <div className="mt-3 grid gap-4 md:grid-cols-2">{optionalFields.map(fieldInput)}</div>
              </details>
            )}
          </div>,
        )}

        {/* ---------- 3. photos ---------- */}
        {section(
          3,
          t('stepPhotos'),
          <div>
            <p className="text-sm text-ink-muted">{t('photosHint')}</p>
            <ul className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
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
          </div>,
        )}

        {/* ---------- 4. contact ---------- */}
        {section(
          4,
          t('stepContact'),
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="sellerName" className={labelCls}>
                {t('yourName')}
              </label>
              <input id="sellerName" value={sellerName} onChange={(e) => setSellerName(e.target.value)} autoComplete="name" className={inputCls} />
              {err('sellerName')}
            </div>
            <div>
              <label htmlFor="phone" className={labelCls}>
                {t('phoneWhatsapp')}
              </label>
              <input id="phone" type="tel" inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="03001234567" className={inputCls} />
              {err('phone')}
            </div>
            <details className="rounded-lg border border-line p-3 md:col-span-2" open={!!errors.whatsapp}>
              <summary className="cursor-pointer text-sm font-semibold text-brand">{t('moreContactOptions')}</summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor="whatsapp" className={labelCls}>
                    {t('whatsapp')}
                  </label>
                  <input id="whatsapp" type="tel" inputMode="tel" dir="ltr" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="03001234567" className={inputCls} />
                  <p className="mt-1 text-xs text-ink-muted">{t('whatsappHint')}</p>
                  {err('whatsapp')}
                </div>
                <label htmlFor="showPhone" className="inline-flex min-h-[44px] items-center gap-2 self-center text-sm">
                  <input id="showPhone" type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} className="h-5 w-5 accent-brand" />
                  {t('showPhone')}
                </label>
              </div>
            </details>
          </div>,
        )}

        {/* ---------- 5. plan + payment ---------- */}
        {section(
          5,
          t('stepPlan'),
          !category ? (
            <p className="text-sm text-ink-muted">{t('chooseCategoryFirst')}</p>
          ) : (
            <div className="space-y-5">
              <fieldset>
                <legend className={labelCls}>{t('duration')}</legend>
                {free && <p className="mt-1 inline-block rounded-md bg-brand-light px-2 py-1 text-sm font-semibold text-brand-dark">{t('freeNow')}</p>}
                <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-6">
                  {durations.map((d) => (
                    <button
                      key={d.days}
                      type="button"
                      aria-pressed={durationDays === d.days}
                      className={`${choice(durationDays === d.days)} flex-col py-2`}
                      onClick={() => setDurationDays(d.days)}
                    >
                      <span>{provider ? t('twoMonths') : `${d.days} ${t('days')}`}</span>
                      <span className="text-xs font-normal">{free ? t('priceFree') : d.price !== null ? formatPrice(d.price, locale) : '-'}</span>
                    </button>
                  ))}
                </div>
                {err('duration')}
              </fieldset>

              {meta.addons.length > 0 && (
                <fieldset>
                  <legend className={labelCls}>{t('addonsTitle')}</legend>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
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

              <details className="rounded-lg border border-line p-3" open={!!referral || !!promoError}>
                <summary className="cursor-pointer text-sm font-semibold text-brand">{t('haveCode')}</summary>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {(needsPayment || promo) && (
                    <div>
                      <label htmlFor="promo" className={labelCls}>
                        {t('promoCode')}
                      </label>
                      <div className="mt-1 flex gap-2">
                        <input
                          id="promo"
                          dir="ltr"
                          value={promoInput}
                          onChange={(e) => {
                            setPromoInput(e.target.value.toUpperCase());
                            setPromoError('');
                          }}
                          maxLength={30}
                          className={inputCls}
                        />
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => {
                            setPromoError('');
                            setPromo(promoInput.trim());
                          }}
                        >
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
                      className={inputCls}
                      aria-describedby="referral-hint"
                    />
                    <p id="referral-hint" className="mt-1 text-xs text-ink-muted">{t('referralHint')}</p>
                  </div>
                </div>
              </details>

              {needsPayment && (
                <fieldset className="rounded-lg bg-page p-4">
                  <legend className="px-1 font-bold">{t('payTitle')}</legend>
                  {quote && (
                    <dl className="space-y-1 text-sm">
                      {quote.items.map((i) => (
                        <div key={i.key} className="flex justify-between gap-4">
                          <dt>{i.key === 'plan' ? `${t('plan')}: ${provider ? t('twoMonths') : `${durationDays} ${t('days')}`}` : meta.addons.find((a) => a.key === i.key)?.[locale === 'ur' ? 'name_ur' : 'name_en'] ?? i.label}</dt>
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
                      <p className="mt-3 text-sm text-ink-muted">{t('payInstructions')}</p>
                      <ul className="mt-2 grid gap-2 md:grid-cols-3" dir="ltr">
                        {meta.paymentMethods.map((m) => {
                          const acc = meta.paymentAccounts;
                          const lines = m === 'bank' ? [acc.bank?.bank_name, acc.bank?.title, acc.bank?.account, acc.bank?.iban] : [acc[m]?.title, acc[m]?.number];
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
                        {meta.paymentMethods.length > 1 && (
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
                        )}
                        <div>
                          <label htmlFor="screenshot" className={labelCls}>
                            {t('screenshot')}
                          </label>
                          <input id="screenshot" type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
                          {err('screenshot')}
                        </div>
                      </div>
                    </>
                  )}
                </fieldset>
              )}
            </div>
          ),
        )}

        {/* ---------- submit ---------- */}
        <div className="space-y-3 border-t border-line pt-4">
          {Object.values(errors).some(Boolean) && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {t('fixErrors')}
            </p>
          )}
          {serverError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {serverError}
            </p>
          )}
          <button type="button" className="btn-accent w-full md:w-auto" onClick={submit} aria-disabled={submitting} disabled={submitting}>
            {submitting ? t('submitting') : t('submit')}
          </button>
          <p className="text-xs text-ink-muted">
            {t('agreeNote')}{' '}
            <Link href="/terms" className="text-brand underline" target="_blank">
              {t('terms')}
            </Link>{' '}
            ·{' '}
            <Link href="/posting-rules" className="text-brand underline" target="_blank">
              {t('rules')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
