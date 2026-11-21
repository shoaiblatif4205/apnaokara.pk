import type { ReactNode } from 'react';

// The real layout (with <html lang dir>) is in [locale]/layout.tsx.
// This pass-through root layout lets app/not-found.tsx work.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
