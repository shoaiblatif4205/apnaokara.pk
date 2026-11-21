import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { getSetting } from '@/lib/settings';
import { pageMetadata, StaticPage } from '@/components/pages/StaticPage';

export const generateMetadata = pageMetadata('download');

export default async function DownloadPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'pages' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const apps = await getSetting<{ play_store: string | null; app_store: string | null }>('public.app_links');
  const stores = [
    [t('getPlay'), apps?.play_store],
    [t('getAppStore'), apps?.app_store],
  ] as [string, string | null | undefined][];
  return (
    <StaticPage
      slug="download"
      locale={locale}
      after={
        <div className="card mt-4 flex flex-wrap gap-3 p-5">
          {stores.map(([label, href]) =>
            href ? (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="btn-primary">
                {label}
              </a>
            ) : (
              <span key={label} className="btn-outline cursor-default opacity-70">
                {label} · {tc('comingSoon')}
              </span>
            ),
          )}
        </div>
      }
    />
  );
}
