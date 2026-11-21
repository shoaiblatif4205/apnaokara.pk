'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';

const SUBJECTS = ['general', 'ad', 'payment', 'advertise', 'rishta', 'report'] as const;

export function ContactForm() {
  const t = useTranslations('pages');
  const locale = useLocale();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    if (!String(body.phone || '').trim() && !String(body.email || '').trim()) return setError(t('needContact'));
    setState('sending');
    const res = await fetch('/api/v1/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, locale }),
    }).catch(() => null);
    if (res?.ok) return setState('sent');
    const msg = (await res?.json().catch(() => null))?.message;
    setError(msg === 'too_short' ? t('tooShort') : msg === 'need_contact' ? t('needContact') : msg === 'too_many' ? 'Too many messages. Please try later.' : 'Please check the form and try again.');
    setState('idle');
  }

  if (state === 'sent') {
    return (
      <p role="status" className="rounded-xl bg-brand-light p-4 font-semibold text-brand-dark">
        {t('sent')}
      </p>
    );
  }

  const input = 'mt-1 block min-h-[44px] w-full rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';
  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2" noValidate>
      <label className="text-sm font-semibold md:col-span-2">
        {t('name')}
        <input name="name" required minLength={2} maxLength={80} autoComplete="name" className={input} />
      </label>
      <label className="text-sm font-semibold">
        {t('phoneOptional')}
        <input name="phone" type="tel" inputMode="tel" dir="ltr" maxLength={20} autoComplete="tel" placeholder="03xx xxxxxxx" className={input} />
      </label>
      <label className="text-sm font-semibold">
        {t('emailOptional')}
        <input name="email" type="email" dir="ltr" maxLength={120} autoComplete="email" className={input} />
      </label>
      <label className="text-sm font-semibold md:col-span-2">
        {t('subject')}
        <select name="subject" className={input} defaultValue="general">
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {t(`subjects.${s}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold md:col-span-2">
        {t('message')}
        <textarea name="message" required minLength={10} maxLength={2000} rows={5} className={input} />
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700 md:col-span-2">
          {error}
        </p>
      )}
      <div className="md:col-span-2">
        <button type="submit" className="btn-primary w-full md:w-auto" disabled={state === 'sending'}>
          {state === 'sending' ? t('sending') : t('send')}
        </button>
      </div>
    </form>
  );
}
