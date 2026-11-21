import type { FreeModeSettings, PriceRow } from '@apna-okara/shared';

// Talks to the website's API (/api/v1/*). Same rules as the website.
// Local testing on a phone: set EXPO_PUBLIC_API_URL in apps/mobile/.env to
// your computer's Wi-Fi address, e.g. http://192.168.1.10:3000

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_SITE_URL || 'https://apnaokara.pk').replace(/\/$/, '');

type Named = { id: number; slug: string; name_en: string; name_ur: string };
export type Field = {
  key: string;
  label_en: string;
  label_ur: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'year';
  options: { en: string; ur: string }[] | null;
  unit_en: string | null;
  unit_ur: string | null;
  is_required: boolean;
};
export type Category = Named & { model: string; icon: string | null; subcategories: Named[]; fields: Field[] };
export type City = Named & { localities: Named[] };
export type PayMethod = 'jazzcash' | 'easypaisa' | 'nayapay' | 'bank';
export type Meta = {
  categories: Category[];
  cities: City[];
  pricing: PriceRow[];
  freeMode: FreeModeSettings | null;
  paymentAccounts: Record<string, Record<string, string | null> | undefined>;
  paymentMethods: PayMethod[];
  addons: { key: 'featured' | 'whatsapp_boost'; price: number; name_en: string; name_ur: string }[];
};

export type Quote = { total: number; subtotal: number; discount: number; items: { key: string; label: string; amount: number }[] };

export async function getQuote(body: Record<string, unknown>): Promise<Quote> {
  return handle(
    await fetch(`${API_URL}/api/v1/quote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  );
}

export type MyAd = {
  reference: string;
  title: string;
  status: string;
  rejectReason: string | null;
  categoryName: { en: string; ur: string };
  cityName: { en: string; ur: string };
  price: number | null;
  createdAt: string;
  expiresAt: string | null;
  coverUrl: string | null;
  canMarkSold: boolean;
  canRenew: boolean;
  /** Secret manage code given (needed to mark sold / reply to reviews) */
  canManage: boolean;
  renew: { free: boolean; durations: { days: number; price: number | null }[] };
  reviews: Review[] | null;
  rating: { avg: number; count: number } | null;
  upgrade: { featured: number | null; boost: number | null; pending: boolean } | null;
};

type Bi = { en: string; ur: string };
export type AdCard = {
  id: string;
  reference: string;
  slug: string;
  model: string;
  title: string;
  price: number | null;
  priceType: string;
  city: Bi;
  locality: Bi | null;
  category: Bi & { slug: string };
  cover: string | null;
  featured: boolean;
  verified: boolean;
  rating: number;
  ratingCount: number;
  approvedAt: string;
};
export type AdDetail = AdCard & {
  description: string;
  status: 'live' | 'expired' | 'sold';
  sellerName: string;
  phone: string | null;
  whatsapp: string | null;
  images: string[];
  views: number;
  fieldList: { label: Bi; value: Bi; unit: Bi | null }[];
};
export type HomeCategory = { id: number; slug: string; model: string; name_en: string; name_ur: string; icon: string | null; show_on_home: boolean; live: number; subs: { slug: string; name_en: string; name_ur: string }[] };
export type HomeData = {
  categories: HomeCategory[];
  cities: { slug: string; name_en: string; name_ur: string; live: number }[];
  featured: AdCard[];
  fresh: AdCard[];
  services: AdCard[];
};

/** Full URL for an image path from the API (/api/files/...). */
export const fileUrl = (p: string | null) => (p ? `${API_URL}${p}` : null);

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json.message || 'Something went wrong');
  return json as T;
}

export async function getHome(): Promise<HomeData> {
  return handle<HomeData>(await fetch(`${API_URL}/api/v1/home`));
}

export type BlogPost = {
  id: string; slug: string; locale: 'en' | 'ur'; title: string; excerpt: string | null; cover: string | null;
  publishedAt: string; readingMinutes: number; category: { slug: string; name_en: string; name_ur: string } | null;
};
export type BlogList = { posts: BlogPost[]; page: number; pages: number; total: number; categories: { slug: string; name_en: string; name_ur: string; posts: number }[] };

export async function getBlog(params: { locale: 'en' | 'ur'; category?: string; page?: number }): Promise<BlogList> {
  const qs = new URLSearchParams({ locale: params.locale, page: String(params.page ?? 1) });
  if (params.category) qs.set('category', params.category);
  return handle(await fetch(`${API_URL}/api/v1/blog?${qs.toString()}`));
}

export async function searchAds(params: Record<string, string | undefined>): Promise<{ ads: AdCard[]; total: number; page: number; pages: number }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && qs.set(k, v));
  return handle(await fetch(`${API_URL}/api/v1/listings?${qs.toString()}`));
}

export async function getAd(reference: string): Promise<{ ad: AdDetail; similar: AdCard[] }> {
  return handle(await fetch(`${API_URL}/api/v1/listings/${encodeURIComponent(reference)}`));
}

export type Review = { id: number; name: string; rating: number; comment: string | null; reply: string | null; createdAt: string };

export async function getReviews(reference: string): Promise<{ reviews: Review[]; dist: Record<string, number> }> {
  return handle(await fetch(`${API_URL}/api/v1/reviews?reference=${encodeURIComponent(reference)}`));
}

export async function postReview(body: { reference: string; name: string; phone: string; rating: number; comment: string }): Promise<void> {
  await handle(
    await fetch(`${API_URL}/api/v1/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export async function reportAd(reference: string, reason: string, details = ''): Promise<void> {
  await handle(
    await fetch(`${API_URL}/api/v1/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, reason, details }),
    }),
  );
}

export async function getMeta(): Promise<Meta> {
  return handle<Meta>(await fetch(`${API_URL}/api/v1/meta`));
}

/** A picked photo on the phone. */
export type LocalFile = { uri: string; name: string; type: string };

export function appendFile(fd: FormData, key: string, f: LocalFile) {
  // React Native's FormData accepts { uri, name, type } for files
  fd.append(key, f as unknown as Blob);
}

export async function postListing(data: object, photos: LocalFile[], screenshot: LocalFile | null): Promise<{ reference: string; manageKey: string }> {
  const fd = new FormData();
  fd.append('data', JSON.stringify(data));
  photos.forEach((p) => appendFile(fd, 'photos', p));
  if (screenshot) appendFile(fd, 'screenshot', screenshot);
  return handle(await fetch(`${API_URL}/api/v1/listings`, { method: 'POST', body: fd }));
}

export async function myAd(fields: Record<string, string>, file?: { key: string; file: LocalFile }): Promise<MyAd> {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  if (file) appendFile(fd, file.key, file.file);
  const res = await handle<{ ad: MyAd }>(await fetch(`${API_URL}/api/v1/my-ads`, { method: 'POST', body: fd }));
  return res.ad;
}
