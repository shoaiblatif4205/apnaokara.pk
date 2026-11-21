'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

export function Stars({ value, size = 16, label }: { value: number; size?: number; label?: string }) {
  return (
    <span className="inline-flex items-center" role="img" aria-label={label ?? `${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          aria-hidden="true"
          className={i <= Math.round(value) ? 'fill-amber-400 text-amber-500' : 'text-gray-300'}
        />
      ))}
    </span>
  );
}

type Labels = Record<string, string>;

/** Write a review: rating, name, phone (private), comment. */
export function ReviewForm({ reference, labels }: { reference: string; labels: Labels }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const input = 'block min-h-[44px] w-full rounded-lg border border-line bg-white px-3 py-2';

  if (done) return <p role="status" className="rounded-lg bg-brand-light p-3 text-brand-dark">{labels.thanks}</p>;
  if (!open)
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        {labels.writeReview}
      </button>
    );

  return (
    <form
      className="space-y-3 rounded-xl border border-line p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!rating) return setError(labels.rateRequired);
        setBusy(true);
        setError('');
        const res = await fetch('/api/v1/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference, name, phone, rating, comment }),
        });
        setBusy(false);
        if (res.ok) {
          setDone(true);
          setTimeout(() => window.location.reload(), 1500);
        } else setError((await res.json().catch(() => ({}))).message || 'Error');
      }}
    >
      <fieldset>
        <legend className="text-sm font-semibold">{labels.yourRating}</legend>
        <div className="mt-1 flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              aria-label={labels.star.replace('{n}', String(i))}
              aria-pressed={rating === i}
              className="flex h-11 w-11 items-center justify-center"
            >
              <Star size={30} aria-hidden="true" className={i <= (hover || rating) ? 'fill-amber-400 text-amber-500' : 'text-gray-300'} />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="rv-name" className="block text-sm font-semibold">
            {labels.yourName}
          </label>
          <input id="rv-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} className={input} />
        </div>
        <div>
          <label htmlFor="rv-phone" className="block text-sm font-semibold">
            {labels.yourPhone}
          </label>
          <input id="rv-phone" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="03001234567" className={input} />
          <p className="mt-1 text-xs text-ink-muted">{labels.phonePrivate}</p>
        </div>
      </div>
      <div>
        <label htmlFor="rv-comment" className="block text-sm font-semibold">
          {labels.comment}
        </label>
        <textarea id="rv-comment" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={labels.commentHint} className={input} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={busy}>
        {labels.submit}
      </button>
    </form>
  );
}
