import { cache } from 'react';
import { q1 } from '@/lib/db';
import { DEFAULT_PAGES, type PageSlug } from '@/lib/defaultPages';

// Info and legal pages. Text comes from Admin -> Pages; while a body is empty
// the default text in lib/defaultPages is shown. Only "archived" hides a page.

export type SitePage = {
  slug: PageSlug;
  title: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: Date | null;
  hidden: boolean;
  usesDefault: boolean;
};

type Row = {
  title_en: string; title_ur: string; body_en: string; body_ur: string;
  seo_title: string | null; seo_description: string | null; status: string; updated_at: Date;
};

export const getPage = cache(async (slug: PageSlug, locale: 'en' | 'ur'): Promise<SitePage> => {
  const row = await q1<Row>(
    'select title_en, title_ur, body_en, body_ur, seo_title, seo_description, status::text, updated_at from pages where slug = $1',
    [slug],
  );
  const def = DEFAULT_PAGES[slug];
  const dbBody = row ? (locale === 'ur' ? row.body_ur : row.body_en).trim() : '';
  const dbTitle = row ? (locale === 'ur' ? row.title_ur : row.title_en).trim() : '';
  return {
    slug,
    title: dbTitle || def.title[locale],
    body: dbBody || def.body[locale],
    seoTitle: row?.seo_title || null,
    seoDescription: row?.seo_description || null,
    updatedAt: dbBody ? row!.updated_at : null,
    hidden: row?.status === 'archived',
    usesDefault: !dbBody,
  };
});

/** First paragraph of Markdown as plain text, for meta descriptions. */
export function plainSummary(md: string, max = 160): string {
  const para = md.split(/\n\s*\n/).find((p) => p.trim() && !p.trim().startsWith('#')) ?? '';
  const text = para.replace(/[*_`>#\[\]()-]/g, '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
