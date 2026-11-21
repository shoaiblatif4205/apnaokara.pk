import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

// Phase 1: most pages are built in later phases, so the 404 says "coming soon".
export default function NotFound() {
  const tc = useTranslations('common');
  return (
    <section className="container-site py-20 text-center">
      <p className="text-6xl font-extrabold text-brand">404</p>
      <h1 className="mt-4 text-2xl font-bold">{tc('comingSoon')}</h1>
      <Link href="/" className="btn-primary mt-8">
        {tc('siteName')}
      </Link>
    </section>
  );
}
