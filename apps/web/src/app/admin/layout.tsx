import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, Noto_Nastaliq_Urdu } from 'next/font/google';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const urdu = Noto_Nastaliq_Urdu({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-urdu', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Apna Okara Admin' },
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg' },
};

// Admin panel is English (Urdu fields are shown right-to-left inside forms).
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${urdu.variable}`}>
      <body className="min-h-screen bg-page font-sans text-ink">{children}</body>
    </html>
  );
}
