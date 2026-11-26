import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

// Wrong link or removed ad: say so plainly and offer the way back.
export default function NotFound() {
  const tc = useTranslations('common');
  return (
    <section className="container-site py-20 text-center">
      <p className="text-6xl font-extrabold text-brand">404</p>
      <h1 className="mt-4 text-2xl font-bold">{tc('notFoundTitle')}</h1>
      <p className="mx-auto mt-2 max-w-md text-ink-muted">{tc('notFoundText')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          {tc('goHome')}
        </Link>
        <Link href="/search" className="btn-outline">
          {tc('search')}
        </Link>
      </div>
    </section>
  );
}
