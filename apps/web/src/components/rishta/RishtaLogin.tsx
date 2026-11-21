'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function RishtaLogin({ locale, submitLabel }: { locale: 'en' | 'ur'; submitLabel?: string }) {
  const t = useTranslations('rishta');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = 'block min-h-[48px] w-full rounded-lg border border-line bg-white px-3 py-2 text-lg';

  async function post(body: Record<string, string>) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/rishta/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      return j;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="card mt-4 space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (step === 'phone') {
          const j = await post({ action: 'send', email, phone, locale });
          if (j) {
            setDevCode(j.devCode ?? '');
            setStep('code');
          }
        } else {
          const j = await post({ action: 'verify', email, phone, code });
          if (j) window.location.href = `/${locale}/rishta/me`;
        }
      }}
    >
      {step === 'phone' ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="r-email" className="block text-sm font-semibold">
              {t('email')}
            </label>
            <input id="r-email" type="email" dir="ltr" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" required className={input} />
            <p className="mt-1 text-xs text-ink-muted">{t('emailHint')}</p>
          </div>
          <div>
            <label htmlFor="r-phone" className="block text-sm font-semibold">
              {t('phone')}
            </label>
            <input id="r-phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567" required className={input} />
            <p className="mt-1 text-xs text-ink-muted">{t('phoneHint')}</p>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-ink-muted">{t('codeSentEmail', { email })}</p>
          {devCode && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{t('devCode', { code: devCode })}</p>}
          <label htmlFor="r-code" className="mt-3 block text-sm font-semibold">
            {t('code')}
          </label>
          <input id="r-code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required className={`${input} tracking-[0.4em]`} />
          <button type="button" className="mt-2 text-sm text-brand underline" onClick={() => setStep('phone')}>
            {t('changeEmail')}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" className="btn w-full bg-pink-700 text-white hover:bg-pink-800" disabled={busy}>
        {step === 'phone' ? t('sendCode') : submitLabel ?? t('verify')}
      </button>
    </form>
  );
}
