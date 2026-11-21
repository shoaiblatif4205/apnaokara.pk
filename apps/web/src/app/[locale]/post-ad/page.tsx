import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { availableMethods, loadMeta } from '@/lib/meta';
import { PostAdForm } from '@/components/post/PostAdForm';
import { getSetting } from '@/lib/settings';
import type { AppLocale } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'post' });
  return { title: t('title'), robots: { index: false } };
}

export default async function PostAdPage(props: { params: Promise<{ locale: string }>; searchParams: Promise<{ model?: string; ref?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  noStore(); // always fresh: categories, prices and Free Mode change from admin
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const [meta, social] = await Promise.all([loadMeta(), getSetting<Record<string, string | null>>('public.social')]);
  return (
    <section className="container-site max-w-3xl py-6">
      <PostAdForm meta={{ ...meta, paymentMethods: availableMethods(meta.paymentAccounts) }} 
        locale={locale}
        initialModel={searchParams.model}
        initialReferral={searchParams.ref}
        communityLink={social?.whatsapp_group || social?.whatsapp_channel || null}
      />
    </section>
  );
}
