import path from 'node:path';
import { existsSync } from 'node:fs';

// Reads a payment screenshot (JazzCash / Easypaisa / NayaPay / bank app) with OCR
// and picks out the payment date + time, the amount and the transaction ID.
// Free: runs on our own server with tesseract.js (English model bundled in node_modules).
// OCR can miss things, so every field is optional: callers only act on what was found.

export type ReceiptInfo = {
  /** Payment time shown on the screenshot (read as Pakistan time) */
  paidAt: Date | null;
  /** Did the screenshot show a time, or only a date? */
  hasTime: boolean;
  amount: number | null;
  transactionId: string | null;
  text: string;
};

const EMPTY: ReceiptInfo = { paidAt: null, hasTime: false, amount: null, transactionId: null, text: '' };
const PKT_OFFSET_MIN = 5 * 60; // Pakistan is UTC+5 all year
const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

type OcrWorker = { recognize: (img: Buffer) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };
let workerPromise: Promise<OcrWorker> | null = null;

/** The English OCR model ships in node_modules (@tesseract.js-data/eng). Find it locally and on Vercel. */
function findLangPath(): string {
  const rel = path.join('node_modules', '@tesseract.js-data', 'eng', '4.0.0_best_int');
  const roots = [process.cwd(), path.join(process.cwd(), '..'), path.join(process.cwd(), '..', '..'), '/var/task'];
  for (const r of roots) {
    const p = path.join(r, rel);
    if (existsSync(path.join(p, 'eng.traineddata.gz'))) return p;
  }
  throw new Error('OCR language file not found');
}

function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = (await import('tesseract.js')) as unknown as { createWorker: (lang: string, oem: number, opts: object) => Promise<OcrWorker> };
      const langPath = findLangPath();
      return createWorker('eng', 1, {
        langPath,
        gzip: true,
        cacheMethod: 'none',
        // errors inside the OCR worker must never crash the server; readReceipt then returns "not read"
        errorHandler: (e: unknown) => console.error('OCR worker error', e),
      });
    })().catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

/** OCR + parse. Never throws: returns empty info if OCR fails or takes too long. */
export async function readReceipt(image: Buffer, timeoutMs = 25_000): Promise<ReceiptInfo> {
  try {
    const sharp = (await import('sharp')).default;
    // Bigger, grey, sharper text reads better
    const prepared = await sharp(image).rotate().resize({ width: 1400, withoutEnlargement: false }).grayscale().normalise().png().toBuffer();
    const worker = await getWorker();
    const result = await Promise.race([
      worker.recognize(prepared),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    if (!result) return EMPTY;
    return parseReceiptText(result.data.text);
  } catch (e) {
    console.error('receipt OCR failed', e);
    return EMPTY;
  }
}

/** Turns a Pakistan local date/time into a real moment in time. */
function pkt(y: number, mo: number, d: number, h = 0, mi = 0): Date | null {
  if (y < 100) y += 2000;
  if (y < 2020 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  // reject impossible dates such as 31 Feb
  if (new Date(Date.UTC(y, mo - 1, d)).getUTCDate() !== d) return null;
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - PKT_OFFSET_MIN * 60_000);
}

function findTime(s: string): { h: number; m: number } | null {
  const m = s.match(/\b([01]?\d|2[0-3])\s?[:.]\s?([0-5]\d)(?:\s?[:.]\s?[0-5]\d)?\s*([AaPp])\.?\s*[Mm]?\b/) || s.match(/\b([01]?\d|2[0-3])\s?:\s?([0-5]\d)(?::[0-5]\d)?\b/);
  if (!m) return null;
  let h = Number(m[1]);
  const mi = Number(m[2]);
  const ap = m[3]?.toLowerCase();
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  return { h, m: mi };
}

const MON = '(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\\.?';

/** Finds a date (and time if there is one) in OCR text. Exported for tests. */
export function findDate(text: string): { date: Date; hasTime: boolean } | null {
  const lines = text.split(/\n+/);
  const tries: { re: RegExp; get: (m: RegExpMatchArray) => [number, number, number] }[] = [
    // 24 Nov 2026 / 24-Nov-26 / 24th November, 2026
    { re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-/.,]*${MON}[\\s\\-/.,]*(\\d{4}|\\d{2})\\b`, 'i'), get: (m) => [Number(m[3]), MONTHS[m[2].toLowerCase().slice(0, 3)], Number(m[1])] },
    // Nov 24, 2026 / November 24 2026
    { re: new RegExp(`\\b${MON}[\\s\\-/.,]*(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-/.,]+(\\d{4})\\b`, 'i'), get: (m) => [Number(m[3]), MONTHS[m[1].toLowerCase().slice(0, 3)], Number(m[2])] },
    // 2026-11-24 / 2026/11/24
    { re: /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/, get: (m) => [Number(m[1]), Number(m[2]), Number(m[3])] },
    // 24/11/2026 / 24-11-26 (Pakistan writes day first)
    { re: /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/, get: (m) => [Number(m[3]), Number(m[2]), Number(m[1])] },
  ];
  for (let i = 0; i < lines.length; i++) {
    for (const t of tries) {
      const m = lines[i].match(t.re);
      if (!m) continue;
      const [y, mo, d] = t.get(m);
      // the time is usually on the same line, or the next one
      const time = findTime(lines[i].replace(m[0], ' ')) ?? findTime(lines[i + 1] ?? '') ?? findTime(lines[i - 1] ?? '');
      const date = pkt(y, mo, d, time?.h ?? 0, time?.m ?? 0);
      if (date) return { date, hasTime: !!time };
    }
  }
  return null;
}

/** Amount paid: "Rs. 1,000", "PKR 1,000.00", "Amount 1000" */
export function findAmount(text: string): number | null {
  const re = /(?:rs\.?|pkr|amount(?:\s*paid|\s*sent|\s*transferred)?|total)\s*[:\-]?\s*(?:rs\.?|pkr)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/gi;
  const found: number[] = [];
  for (const m of text.matchAll(re)) {
    const n = Math.round(Number(m[1].replace(/,/g, '')));
    if (n >= 10 && n <= 1_000_000) found.push(n);
  }
  return found.length ? Math.max(...found) : null;
}

/** Transaction ID: "TID: 1234567890", "Transaction ID 0123456789", "Ref No. AB12CD34" */
export function findTransactionId(text: string): string | null {
  const re = /(?:\bT\.?\s?ID\b|trans(?:action)?\.?\s*(?:id|no\.?|number|#|ref(?:erence)?)|\bref(?:erence)?\.?\s*(?:no\.?|number|#|id)|\bTRX\s*(?:id)?|\bRRN)\s*[:#.\-]*\s*([A-Z0-9][A-Z0-9\- ]{5,34})/i;
  const m = text.match(re);
  if (!m) return null;
  const id = m[1].split(/\s{2,}|\n/)[0].replace(/[\s-]/g, '').toUpperCase();
  // must contain at least 6 digits to be a real ID, not a word
  return /\d{6,}/.test(id) && id.length >= 6 && id.length <= 30 ? id : null;
}

export function parseReceiptText(raw: string): ReceiptInfo {
  const text = raw.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  const d = findDate(text);
  return { paidAt: d?.date ?? null, hasTime: d?.hasTime ?? false, amount: findAmount(text), transactionId: findTransactionId(text), text: text.slice(0, 2000) };
}
