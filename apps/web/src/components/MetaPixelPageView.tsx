'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * The Pixel code in the page head sends the first PageView. Moving to another page inside
 * the site does not reload the page, so this sends a PageView for every later page.
 */
export function MetaPixelPageView() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.fbq?.('track', 'PageView');
  }, [pathname]);
  return null;
}
