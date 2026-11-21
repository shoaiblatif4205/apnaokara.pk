import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { models } from '@apna-okara/shared';
import { Link, type AppLocale } from '@/i18n/routing';
import { getCategories } from '@/lib/public';
import { named } from '@/lib/format';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Breadcrumbs } from '@/components/browse/Breadcrumbs';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'browse' });
  return { title: t('allCategories'), alternates: { canonical: `/${params.locale}/categories`, languages: { en: '/en/categories', ur: '/ur/categories' } } };
}

export default async function CategoriesPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  noStore();
  const locale = params.locale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'browse' });
  const cats = await getCategories();
  return (
    <div className="container-site py-4">
      <Breadcrumbs items={[{ label: t('home'), href: '/' }, { label: t('allCategories'), href: '/categories' }]} locale={locale} />
      <h1 className="mt-3 text-2xl font-bold md:text-3xl">{t('allCategories')}</h1>
      {models.map((m) => {
        const list = cats.filter((c) => c.model === m.key);
        if (!list.length) return null;
        return (
          <section key={m.key} className="mt-8">
            <h2 className="section-title">{m.name[locale]}</h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <li key={c.slug} className="card p-4">
                  <Link href={`/${c.slug}`} className="flex items-center gap-3 font-bold hover:text-brand">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-light text-brand">
                      <CategoryIcon icon={(c.icon ?? 'other') as never} size={22} />
                    </span>
                    <span>
                      {named(c, locale)}
                      <span className="block text-xs font-normal text-ink-muted">{t('adsCount', { count: c.live })}</span>
                    </span>
                  </Link>
                  <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    {c.subs.map((s) => (
                      <li key={s.slug}>
                        <Link href={`/${c.slug}/${s.slug}`} className="text-ink-muted hover:text-brand hover:underline">
                          {named(s, locale)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
