'use client';

import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { FavoriteButton, readFavs, type Fav } from './FavoriteButton';

export function SavedAds({ empty, removeLabel, saveLabel }: { empty: string; removeLabel: string; saveLabel: string }) {
  const [list, setList] = useState<Fav[] | null>(null);
  useEffect(() => {
    const sync = () => setList(readFavs());
    sync();
    window.addEventListener('ao-favs', sync);
    return () => window.removeEventListener('ao-favs', sync);
  }, []);
  if (list === null) return null;
  if (!list.length) return <p className="card mt-4 p-8 text-center text-ink-muted">{empty}</p>;
  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {list.map((f) => (
        <li key={f.reference} className="card relative overflow-hidden">
          <Link href={f.path} className="block">
            <div className="aspect-[4/3] bg-page">
              {f.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.cover} alt={f.title} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-ink-muted">
                  <ImageOff size={28} aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="font-extrabold">{f.price}</p>
              <p className="line-clamp-2 text-sm text-ink-muted">{f.title}</p>
              <p className="mt-1 text-xs text-ink-muted">{f.place}</p>
            </div>
          </Link>
          <div className="absolute end-2 top-2">
            <FavoriteButton fav={f} labelSave={saveLabel} labelSaved={removeLabel} />
          </div>
        </li>
      ))}
    </ul>
  );
}
