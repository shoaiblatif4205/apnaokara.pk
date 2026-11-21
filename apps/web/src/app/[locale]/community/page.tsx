import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { getSetting } from '@/lib/settings';
import { pageMetadata, StaticPage } from '@/components/pages/StaticPage';

export const generateMetadata = pageMetadata('community');

export default async function CommunityPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'pages' });
  const social = await getSetting<Record<string, string | null>>('public.social');
  const links = [
    [t('joinWhatsapp'), social?.whatsapp_group],
    [t('followWhatsapp'), social?.whatsapp_channel],
    [t('followFacebook'), social?.facebook],
    ['Instagram', social?.instagram],
    ['YouTube', social?.youtube],
  ].filter(([, href]) => href) as [string, string][];
  return (
    <StaticPage
      slug="community"
      locale={locale}
      after={
        <div className="card mt-4 p-5">
          {links.length ? (
            <ul className="flex flex-wrap gap-3">
              {links.map(([label, href], i) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className={i === 0 ? 'btn-primary' : 'btn-outline'}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted">{t('linksSoon')}</p>
          )}
        </div>
      }
    />
  );
}
