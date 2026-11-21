'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** <details> that starts closed on phones and opens itself on wider screens. */
export function AutoOpenDetails({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current && window.matchMedia('(min-width: 768px)').matches) ref.current.open = true;
  }, []);
  return (
    <details ref={ref} className={className}>
      {children}
    </details>
  );
}
