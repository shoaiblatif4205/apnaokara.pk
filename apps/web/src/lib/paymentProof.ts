import { createHash } from 'node:crypto';
import { q, q1 } from '@/lib/db';
import { UserError } from '@/lib/errors';
import { readReceipt, type ReceiptInfo } from '@/lib/receiptOcr';

// Stops the most common fake payments before they reach the admin:
//  - the same screenshot file sent again
//  - an old screenshot (OCR reads the payment date and time; older than 48 hours is refused)
//  - a transaction ID already used (typed, or read from the screenshot; also blocked by a database rule)
// The admin still checks every payment in the real JazzCash / Easypaisa / bank account.

/** Fingerprint of the (processed) screenshot. Used as the file name: <prefix>/<hash>.webp */
export function screenshotHash(processed: Buffer): string {
  return createHash('sha256').update(processed).digest('hex').slice(0, 40);
}

export function screenshotKey(prefix: string, processed: Buffer): string {
  return `${prefix}/${screenshotHash(processed)}.webp`;
}

export function cleanTransactionId(tid: string): string {
  return tid.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Screenshots older than this are refused (the payment should be made just before posting). */
export const MAX_SCREENSHOT_AGE_HOURS = 48;

const fmtPkt = (d: Date, withTime: boolean) =>
  d.toLocaleString('en-GB', {
    timeZone: 'Asia/Karachi',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
  });

/**
 * Checks a payment before it is saved. Throws a UserError the customer can read when:
 *  - there is no screenshot, or the same screenshot was already used
 *  - the screenshot (read by OCR) shows a payment older than 48 hours, or a date in the future
 *  - the transaction ID (typed, or read from the screenshot) was already used
 * What OCR read is saved in payment_receipts so the admin sees it next to the payment.
 */
export async function assertNewPayment(
  method: string,
  transactionId: string | null | undefined,
  processedShot: Buffer | null,
  opts: { fileTime?: unknown } = {},
): Promise<ReceiptInfo | null> {
  if (!processedShot) throw new UserError('payment', 'Please add the screenshot of your payment. / ادائیگی کا اسکرین شاٹ لگائیں۔');
  const hash = screenshotHash(processedShot);
  const usedShot = await q1(`select 1 from payments where screenshot_hash = $1 and status <> 'rejected'`, [hash]);
  if (usedShot) {
    throw new UserError(
      'payment',
      'This screenshot has already been used for another payment. Send the screenshot of this payment. / یہ اسکرین شاٹ پہلے استعمال ہو چکا ہے۔ اس ادائیگی کا نیا اسکرین شاٹ لگائیں۔',
    );
  }

  // A typed transaction ID (older app versions) is still checked
  const typed = cleanTransactionId(transactionId ?? '');
  if (typed) {
    const looksWrong =
      typed.length < 6 ||
      typed.length > 30 ||
      ((method === 'jazzcash' || method === 'easypaisa') && !/\d{6,}/.test(typed)) ||
      /^(\d)\1+$/.test(typed) ||
      /^(123456|012345|111111|000000)/.test(typed);
    if (looksWrong) throw new UserError('payment', 'This transaction ID does not look right. Copy it exactly from your payment message.');
    await assertTidUnused(typed);
  }

  // Read the screenshot: payment date + time, amount, transaction ID
  const info = await readReceipt(processedShot);
  const now = Date.now();
  if (info.paidAt) {
    const ageH = (now - info.paidAt.getTime()) / 3_600_000;
    // only a date and no time: the payment could be late that day, so allow one more day
    const limit = MAX_SCREENSHOT_AGE_HOURS + (info.hasTime ? 0 : 24);
    if (ageH > limit) {
      const when = fmtPkt(info.paidAt, info.hasTime);
      throw new UserError(
        'payment_old',
        `This payment screenshot is from ${when}. Only payments made in the last 2 days are accepted. Pay now and add the new screenshot, or message us on WhatsApp. / یہ اسکرین شاٹ ${when} کا ہے۔ صرف پچھلے 2 دن کی ادائیگی قبول ہے۔ نئی ادائیگی کر کے اس کا اسکرین شاٹ لگائیں، یا ہمیں واٹس ایپ کریں۔`,
      );
    }
    if (ageH < -(info.hasTime ? 6 : 30)) {
      throw new UserError(
        'payment_date',
        'The date on this screenshot is in the future. Send the original screenshot of your payment. / اس اسکرین شاٹ پر آنے والی تاریخ ہے۔ ادائیگی کا اصل اسکرین شاٹ لگائیں۔',
      );
    }
  }
  // OCR worked but found no date: the screenshot is cut or unclear, so its age cannot be checked
  if (info.ocrRan && !info.paidAt) {
    throw new UserError(
      'payment_unclear',
      'We could not read the date on this screenshot. Add the full screenshot of the payment receipt, where the date, time, amount and transaction ID can be seen. / اس اسکرین شاٹ پر تاریخ نظر نہیں آ رہی۔ ادائیگی کی رسید کا پورا اسکرین شاٹ لگائیں جس میں تاریخ، وقت، رقم اور ٹرانزیکشن آئی ڈی نظر آئے۔',
    );
  }
  if (info.transactionId && info.transactionId !== typed) await assertTidUnused(info.transactionId);
  // A copy of an earlier screenshot (re-saved, forwarded on WhatsApp, cropped) has a new file fingerprint,
  // but the same payment: same app, same minute, same amount.
  if (info.paidAt && info.hasTime && info.amount != null) {
    const same = await q1(
      `select 1 from payment_receipts r join payments p on p.screenshot_hash = r.screenshot_hash
        where p.status in ('pending', 'verified') and p.method::text = $3 and r.amount = $2 and r.has_time
          and date_trunc('minute', r.paid_at) = date_trunc('minute', $1::timestamptz)
        limit 1`,
      [info.paidAt, info.amount, method],
    ).catch(() => null); // before the database update has run
    if (same) {
      throw new UserError(
        'payment',
        'This payment has already been used for another ad. Each payment can be used only once: make a new payment for this ad. / یہ ادائیگی پہلے کسی اور اشتہار کے لیے استعمال ہو چکی ہے۔ ہر ادائیگی صرف ایک بار استعمال ہو سکتی ہے، اس اشتہار کے لیے نئی ادائیگی کریں۔',
      );
    }
  }

  // When the phone says the screenshot file was made (shown to the admin, not used to refuse)
  const n = Number(opts.fileTime);
  const fileTime = Number.isFinite(n) && n > Date.UTC(2020, 0, 1) && n < now + 86_400_000 ? new Date(n) : null;

  // Saving what was read must never stop a payment (e.g. before the database update has run)
  await q(
    `insert into payment_receipts (screenshot_hash, paid_at, has_time, amount, transaction_id, file_time, ocr_text, read_ok)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (screenshot_hash) do update set paid_at = excluded.paid_at, has_time = excluded.has_time, amount = excluded.amount,
       transaction_id = excluded.transaction_id, file_time = excluded.file_time, ocr_text = excluded.ocr_text,
       read_ok = excluded.read_ok, created_at = now()`,
    [hash, info.paidAt, info.hasTime, info.amount, info.transactionId, fileTime, info.text || null, !!(info.paidAt || info.amount || info.transactionId)],
  ).catch((e) => console.error('could not save receipt info', e));
  return info;
}

async function assertTidUnused(key: string) {
  const onlyPayments = `select 1 from payments p where p.status in ('pending', 'verified') and p.transaction_key = $1 limit 1`;
  const used = await q1(
    `select 1 from payments p where p.status in ('pending', 'verified') and p.transaction_key = $1
     union all
     select 1 from payment_receipts r join payments p on p.screenshot_hash = r.screenshot_hash
      where r.transaction_id = $1 and p.status in ('pending', 'verified')
     limit 1`,
    [key],
  ).catch(() => q1(onlyPayments, [key])); // before the database update has run
  if (used) {
    throw new UserError(
      'payment',
      `This payment (transaction ID ${key}) has already been used. Each payment can be used only once. / یہ ادائیگی پہلے استعمال ہو چکی ہے۔ ہر ادائیگی صرف ایک بار استعمال ہو سکتی ہے۔`,
    );
  }
}
