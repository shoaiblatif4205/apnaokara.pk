'use client';

import { useTranslations } from 'next-intl';
import type { PaymentAccounts } from '@/lib/meta';
import { appendScreenshot } from '@/lib/shrinkImage';

export type Method = 'jazzcash' | 'easypaisa' | 'nayapay' | 'bank';
export const METHOD_LABEL: Record<Method, string> = { jazzcash: 'JazzCash', easypaisa: 'Easypaisa', nayapay: 'NayaPay', bank: 'Bank transfer' };
export type PayState = { method: Method | ''; paidFrom: string; shot: File | null };

/** Payment details block (accounts to pay to + method, screenshot). */
export function PaymentFields({ methods, accounts, value, onChange }: { methods: Method[]; accounts: PaymentAccounts; value: PayState; onChange: (v: PayState) => void }) {
  const tp = useTranslations('post');
  const input = 'block min-h-[44px] w-full rounded-lg border border-line bg-white px-3 py-2';
  if (!methods.length) return <p className="text-sm text-red-800">{tp('noAccounts')}</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">{tp('payInstructions')}</p>
      <ul className="grid gap-2 md:grid-cols-3" dir="ltr">
        {methods.map((m) => {
          const lines = m === 'bank' ? [accounts.bank?.bank_name, accounts.bank?.title, accounts.bank?.account, accounts.bank?.iban] : [accounts[m]?.title, accounts[m]?.number];
          return (
            <li key={m} className="rounded-lg border border-line bg-white p-3 text-sm">
              <p className="font-bold">{METHOD_LABEL[m]}</p>
              {lines.filter(Boolean).map((l) => (
                <p key={l}>{l}</p>
              ))}
            </li>
          );
        })}
      </ul>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="pf-method" className="block text-sm font-semibold">{tp('payMethod')}</label>
          <select id="pf-method" value={value.method} onChange={(e) => onChange({ ...value, method: e.target.value as Method })} className={input}>
            <option value="">{tp('select')}</option>
            {methods.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pf-from" className="block text-sm font-semibold">{tp('paidFrom')}</label>
          <input id="pf-from" value={value.paidFrom} onChange={(e) => onChange({ ...value, paidFrom: e.target.value })} className={input} />
        </div>
        <div>
          <label htmlFor="pf-shot" className="block text-sm font-semibold">{tp('screenshot')}</label>
          <input id="pf-shot" type="file" accept="image/*" onChange={(e) => onChange({ ...value, shot: e.target.files?.[0] ?? null })} className="mt-1 block w-full text-sm" />
        </div>
      </div>
    </div>
  );
}

export function payValid(p: PayState) {
  return !!p.method && !!p.shot;
}

/** Adds the payment to the form. The screenshot is shrunk first (the server accepts at most 4.5 MB). */
export async function appendPay(fd: FormData, p: PayState) {
  fd.append('method', p.method);
  fd.append('paidFrom', p.paidFrom);
  if (p.shot) await appendScreenshot(fd, p.shot);
}
