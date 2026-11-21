'use client';

import { useState } from 'react';
import { Flag, MessageCircle, Phone, Share2 } from 'lucide-react';
import { toWhatsAppNumber } from '@apna-okara/shared';

type Labels = Record<string, string>;

/** Call / WhatsApp / show number. The number is hidden until the visitor taps. */
export function ContactButtons({ phone, whatsapp, waText, labels }: { phone: string | null; whatsapp: string | null; waText: string; labels: Labels }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="grid gap-2">
      {whatsapp && (
        <a
          href={`https://wa.me/${toWhatsAppNumber(whatsapp)}?text=${encodeURIComponent(waText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn bg-[#128C4A] text-white hover:bg-[#0e6e3a]"
        >
          <MessageCircle size={20} aria-hidden="true" /> {labels.whatsapp}
        </a>
      )}
      {phone &&
        (shown ? (
          <a href={`tel:${phone}`} className="btn-primary" dir="ltr">
            <Phone size={20} aria-hidden="true" /> {phone}
          </a>
        ) : (
          <button type="button" className="btn-outline" onClick={() => setShown(true)}>
            <Phone size={20} aria-hidden="true" /> {labels.showNumber}
          </button>
        ))}
    </div>
  );
}

export function ShareButton({ title, labels }: { title: string; labels: Labels }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-outline"
      onClick={async () => {
        const url = window.location.href;
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
            return;
          } catch {
            /* cancelled */
          }
        }
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt('', url);
        }
      }}
    >
      <Share2 size={18} aria-hidden="true" /> {copied ? labels.copied : labels.share}
    </button>
  );
}

const REASONS = ['fraud', 'wrong_category', 'sold', 'offensive', 'duplicate', 'other'] as const;

export function ReportForm({ reference, labels }: { reference: string; labels: Labels }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number] | ''>('');
  const [details, setDetails] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const reasonLabel: Record<string, string> = {
    fraud: labels.reportFraud,
    wrong_category: labels.reportWrongCategory,
    sold: labels.reportSold,
    offensive: labels.reportOffensive,
    duplicate: labels.reportDuplicate,
    other: labels.reportOther,
  };

  if (done) return <p role="status" className="text-sm text-brand-dark">{labels.reportThanks}</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-ink-muted hover:text-red-700">
        <Flag size={16} aria-hidden="true" /> {labels.report}
      </button>
    );
  }
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!reason) return setError(labels.reportReason);
        const res = await fetch('/api/v1/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference, reason, details }),
        });
        if (res.ok) setDone(true);
        else setError((await res.json().catch(() => ({}))).message || 'Error');
      }}
    >
      <fieldset>
        <legend className="text-sm font-semibold">{labels.reportReason}</legend>
        <div className="mt-2 grid gap-1">
          {REASONS.map((r) => (
            <label key={r} className="inline-flex min-h-[36px] items-center gap-2 text-sm">
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-brand" />
              {reasonLabel[r]}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor="report-details" className="block text-sm font-semibold">
        {labels.reportDetails}
      </label>
      <textarea id="report-details" rows={2} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} className="block w-full rounded-lg border border-line p-2 text-sm" />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" className="btn-outline">
        {labels.reportSend}
      </button>
    </form>
  );
}

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="aspect-[4/3] rounded-xl bg-page" />;
  return (
    <div>
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-gray-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt={`${title} (${i + 1}/${images.length})`} className="max-h-full max-w-full object-contain" />
      </div>
      {images.length > 1 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto">
          {images.map((src, k) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setI(k)}
                aria-label={`${k + 1}`}
                aria-current={k === i}
                className={`block h-16 w-16 overflow-hidden rounded-lg border-2 ${k === i ? 'border-brand' : 'border-transparent'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
