import { cache } from 'react';
import { getSetting } from '@/lib/settings';

// SEO settings (Admin -> SEO). Stored in site_settings under "seo".
// Everything has a default, so the site works before the admin saves anything.

export type Tpl = { en: string; ur: string };
export type SeoSettings = {
  templates: {
    category: Tpl; // {category}
    categoryCity: Tpl; // {category} {city}
    city: Tpl; // {city}
    ad: Tpl; // {title} {price} {city}
    provider: Tpl; // {title} {category} {city} {rating}
  };
  ai_crawlers: 'allow' | 'block';
  blocked_paths: string; // extra Disallow lines for robots.txt, one per line
  llms_extra: string; // extra text added to llms.txt
  gsc_verification: string | null;
  bing_verification: string | null;
  ga4_id: string | null;
  index_empty_city_pages: boolean;
};

export const DEFAULT_SEO: SeoSettings = {
  templates: {
    category: { en: '{category} for sale in Okara, Sahiwal & Pakpattan', ur: '{category}: اوکاڑہ، ساہیوال اور پاکپتن میں خرید و فروخت' },
    categoryCity: { en: '{category} in {city}', ur: '{city} میں {category}' },
    city: { en: 'Buy and sell in {city}: ads, services and jobs', ur: '{city} میں خرید و فروخت: اشتہار، کاریگر اور نوکریاں' },
    ad: { en: '{title} - {price} - {city}', ur: '{title} - {price} - {city}' },
    provider: { en: '{title} - {category} in {city} {rating}', ur: '{title} - {city} میں {category} {rating}' },
  },
  ai_crawlers: 'allow',
  blocked_paths: '',
  llms_extra: '',
  gsc_verification: null,
  bing_verification: null,
  ga4_id: null,
  index_empty_city_pages: false,
};

export const getSeo = cache(async (): Promise<SeoSettings> => {
  const s = await getSetting<Partial<SeoSettings>>('seo');
  return { ...DEFAULT_SEO, ...(s ?? {}), templates: { ...DEFAULT_SEO.templates, ...(s?.templates ?? {}) } };
});

/** "{category} in {city}" + values -> text. Empty parts and extra spaces are cleaned up. */
export function fill(tpl: string, vars: Record<string, string | number | null | undefined>): string {
  return tpl
    .replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] == null ? '' : String(vars[k])))
    .replace(/\s+-\s+(?=-|$)/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s-]+$/, '')
    .trim();
}

/** JSON-LD script content that is safe inside <script> (no "</script>" break-out). */
export function ld(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://apnaokara.pk').replace(/\/$/, '');

/** Known AI crawlers (robots.txt "AI crawlers" setting). */
export const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'meta-externalagent'];
