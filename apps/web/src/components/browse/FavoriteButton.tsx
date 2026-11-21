'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

// Saved ads live in the browser (no login).
export type Fav = { reference: string; path: string; title: string; price: string; cover: string | null; place: string };
const KEY = 'ao.favs';

export function readFavs(): Fav[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
function writeFavs(list: Fav[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
    window.dispatchEvent(new Event('ao-favs'));
  } catch {
    /* storage not available */
  }
}

export function FavoriteButton({ fav, labelSave, labelSaved, withText = false }: { fav: Fav; labelSave: string; labelSaved: string; withText?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(readFavs().some((f) => f.reference === fav.reference));
    sync();
    window.addEventListener('ao-favs', sync);
    return () => window.removeEventListener('ao-favs', sync);
  }, [fav.reference]);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? labelSaved : labelSave}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const list = readFavs();
        writeFavs(on ? list.filter((f) => f.reference !== fav.reference) : [fav, ...list]);
      }}
      className={
        withText
          ? 'btn-outline'
          : 'flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm hover:text-red-600'
      }
    >
      <Heart size={20} aria-hidden="true" className={on ? 'fill-red-600 text-red-600' : ''} />
      {withText && (on ? labelSaved : labelSave)}
    </button>
  );
}
