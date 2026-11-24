import { Badge } from '@/components/admin/ui';

/** Columns read from payment_receipts (OCR of the payment screenshot). Select them as rc_*. */
export const RECEIPT_COLS = `rc.paid_at as rc_paid_at, rc.has_time as rc_has_time, rc.amount as rc_amount, rc.transaction_id as rc_tid,
  rc.file_time as rc_file_time, rc.read_ok as rc_ok`;
export const RECEIPT_JOIN = 'left join payment_receipts rc on rc.screenshot_hash = p.screenshot_hash';

export type ReceiptCols = {
  rc_paid_at: string | null;
  rc_has_time: boolean | null;
  rc_amount: number | null;
  rc_tid: string | null;
  rc_file_time: string | null;
  rc_ok: boolean | null;
};

const pk = (d: string, time = true) =>
  new Date(d).toLocaleString('en-GB', {
    timeZone: 'Asia/Karachi',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(time ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
  });

function ago(fromIso: string, toIso: string) {
  const h = (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 3_600_000;
  if (h < 0) return 'after posting';
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min before posting`;
  if (h < 48) return `${Math.round(h)} h before posting`;
  return `${Math.round(h / 24)} days before posting`;
}

/** What the server read from the payment screenshot, with warnings for the admin. */
export function ReceiptCheck({ r, amount, createdAt }: { r: ReceiptCols; amount: number; createdAt: string }) {
  if (r.rc_ok == null) return null; // older payment, never read
  if (!r.rc_ok) {
    return (
      <p className="mt-1">
        <Badge tone="orange">Screenshot could not be read: check the date, amount and ID by hand</Badge>
      </p>
    );
  }
  const low = r.rc_amount != null && r.rc_amount < amount;
  const fileOld = r.rc_file_time && new Date(createdAt).getTime() - new Date(r.rc_file_time).getTime() > 48 * 3_600_000;
  return (
    <div className="mt-1 rounded-md bg-gray-50 p-2 text-xs">
      <p className="font-semibold">Read from the screenshot:</p>
      <p>
        Paid on:{' '}
        {r.rc_paid_at ? (
          <>
            <b>{pk(r.rc_paid_at, !!r.rc_has_time)}</b> ({ago(r.rc_paid_at, createdAt)})
          </>
        ) : (
          <span className="text-orange-700">date not found</span>
        )}
        {' · '}Amount:{' '}
        {r.rc_amount != null ? <b className={low ? 'text-red-700' : 'text-green-700'}>Rs {r.rc_amount.toLocaleString('en-PK')}</b> : <span className="text-orange-700">not found</span>}
        {' · '}ID: {r.rc_tid ? <b dir="ltr">{r.rc_tid}</b> : <span className="text-orange-700">not found</span>}
      </p>
      {r.rc_file_time && <p className="text-ink-muted">Screenshot file made: {pk(r.rc_file_time)}</p>}
      <p className="mt-1 flex flex-wrap gap-1">
        {low && <Badge tone="red">Amount on screenshot is less than Rs {amount.toLocaleString('en-PK')}</Badge>}
        {fileOld && <Badge tone="orange">Screenshot file is more than 2 days old</Badge>}
      </p>
    </div>
  );
}
