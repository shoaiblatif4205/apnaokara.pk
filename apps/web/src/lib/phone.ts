import { isValidPakMobile } from '@apna-okara/shared';

/** Store every phone the same way: 03XXXXXXXXX. Returns null if not a valid Pakistani mobile. */
export function normalizePhone(input: string): string | null {
  const raw = (input ?? '').replace(/[\s-]/g, '');
  if (!isValidPakMobile(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('92') ? '0' + digits.slice(2) : digits;
}

/** Simple in-memory rate limit (per server process). */
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  return false;
}

/** Visitor address for rate limits. Vercel's own headers first (a visitor cannot fake them). */
export function clientIp(headers: { get(name: string): string | null }): string {
  return (
    headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    headers.get('x-forwarded-for')?.split(',').pop()?.trim() ||
    'local'
  );
}
