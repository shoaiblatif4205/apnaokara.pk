import { createHash } from 'node:crypto';
import { q1 } from '@/lib/db';
import { UserError } from '@/lib/errors';

// Stops the most common fake payments before they reach the admin:
//  - a transaction ID that does not look real
//  - a transaction ID already used for another payment (also blocked by a database rule)
//  - the same screenshot file sent again
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

export async function assertNewPayment(method: string, transactionId: string, processedShot: Buffer | null): Promise<void> {
  const key = cleanTransactionId(transactionId);
  // JazzCash / Easypaisa IDs are long numbers; bank references are letters and digits
  if (key.length < 6 || key.length > 30 || ((method === 'jazzcash' || method === 'easypaisa') && !/\d{6,}/.test(key))) {
    throw new UserError('payment', 'This transaction ID does not look right. Copy it exactly from your payment message.');
  }
  if (/^(\d)\1+$/.test(key) || /^(123456|012345|111111|000000)/.test(key)) {
    throw new UserError('payment', 'This transaction ID does not look right. Copy it exactly from your payment message.');
  }
  const usedTid = await q1(`select 1 from payments where method::text = $1 and transaction_key = $2 and status in ('pending', 'verified')`, [method, key]);
  if (usedTid) throw new UserError('payment', 'This transaction ID has already been used. Each payment can be used only once.');
  if (processedShot) {
    const usedShot = await q1(`select 1 from payments where screenshot_hash = $1 and status <> 'rejected'`, [screenshotHash(processedShot)]);
    if (usedShot) throw new UserError('payment', 'This screenshot has already been used for another payment. Send the screenshot of this payment.');
  }
}
