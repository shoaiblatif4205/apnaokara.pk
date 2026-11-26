import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);
const MAIN_SITE = 'https://www.apnaokara.pk';

// Redirects from Admin -> SEO. The list is loaded from the API and kept for 2 minutes.
type Rule = [from: string, to: string, status: number];
let rules: Map<string, Rule> | null = null;
let loadedAt = 0;

async function getRules(origin: string): Promise<Map<string, Rule>> {
  if (rules && Date.now() - loadedAt < 120_000) return rules;
  try {
    const res = await fetch(`${origin}/api/v1/redirects`, { cache: 'no-store' });
    const list = (await res.json()) as Rule[];
    rules = new Map(list.map((r) => [r[0].replace(/\/$/, '') || '/', r]));
    loadedAt = Date.now();
  } catch {
    rules = rules ?? new Map();
    loadedAt = Date.now() - 90_000; // try again in 30 seconds
  }
  return rules;
}

export default async function middleware(req: NextRequest) {
  // The live site has one address: www.apnaokara.pk. Old vercel.app links move there
  // (same page), so visitors, shared links and Google all end up on the real domain.
  const host = (req.headers.get('host') ?? '').toLowerCase();
  if (process.env.VERCEL_ENV === 'production' && host.endsWith('.vercel.app')) {
    const to = new URL(req.nextUrl.pathname + req.nextUrl.search, MAIN_SITE);
    return NextResponse.redirect(to, 308);
  }
  const path = decodeURIComponent(req.nextUrl.pathname).replace(/\/$/, '') || '/';
  if (path !== '/') {
    const map = await getRules(req.nextUrl.origin);
    const hit = map.get(path) ?? map.get(path.replace(/^\/(en|ur)(?=\/)/, ''));
    if (hit) {
      const to = new URL(hit[1], req.nextUrl.origin);
      req.nextUrl.searchParams.forEach((v, k) => to.searchParams.has(k) || to.searchParams.set(k, v));
      return NextResponse.redirect(to, hit[2] === 302 ? 302 : 301);
    }
  }
  return intl(req);
}

export const config = {
  // All pages except API, Next internals and files with an extension
  matcher: ['/((?!api|_next|_vercel|admin|.*\\..*).*)'],
};
