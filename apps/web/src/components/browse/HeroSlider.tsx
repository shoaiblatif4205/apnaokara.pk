'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Rotating hero slides (our own slides + paid brand slides). Pauses on hover/focus.
export function HeroSlider({ slides, labels }: { slides: ReactNode[]; labels: { prev: string; next: string; slide: string } }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;

  useEffect(() => {
    if (n < 2 || paused) return;
    const id = setInterval(() => setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(id);
  }, [n, paused]);

  return (
    <div
      className="relative h-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {slides.map((s, k) => (
        <div key={k} className={k === i ? 'h-full' : 'hidden'} aria-roledescription="slide" aria-label={`${labels.slide} ${k + 1} / ${n}`}>
          {s}
        </div>
      ))}
      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => setI((i - 1 + n) % n)}
            className="absolute start-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink hover:bg-white rtl:rotate-180"
            aria-label={labels.prev}
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setI((i + 1) % n)}
            className="absolute end-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink hover:bg-white rtl:rotate-180"
            aria-label={labels.next}
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
          <div className="absolute bottom-3 start-1/2 flex -translate-x-1/2 gap-2 rtl:translate-x-1/2">
            {slides.map((_, k) => (
              <button
                key={k}
                type="button"
                onClick={() => setI(k)}
                aria-label={`${labels.slide} ${k + 1}`}
                aria-current={k === i}
                className={`h-2.5 rounded-full ${k === i ? 'w-6 bg-white' : 'w-2.5 bg-white/60'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
