import Link from 'next/link';
import { Badge } from './ui';
import { SubmitButton } from './SubmitButton';
import { clearReply, setReviewHidden } from '@/app/admin/(panel)/reviews/actions';

export type ReviewRow = {
  id: number; reviewer_name: string; reviewer_phone: string; rating: number; comment: string | null; provider_reply: string | null;
  is_hidden: boolean; hidden_reason: string | null; created_at: string; listing_id: string; reference: string; title: string;
  same_phone: number;
};

export const REVIEW_SELECT = `
  select r.id, r.reviewer_name, r.reviewer_phone, r.rating, r.comment, r.provider_reply, r.is_hidden, r.hidden_reason, r.created_at,
         l.id as listing_id, l.reference, l.title,
         (select count(*)::int from reviews x where x.reviewer_phone = r.reviewer_phone) as same_phone
    from reviews r join listings l on l.id = r.listing_id`;

export function ReviewItem({ r, back, showAd = true }: { r: ReviewRow; back: string; showAd?: boolean }) {
  return (
    <li className="rounded-lg border border-line p-3 text-sm">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{r.reviewer_name}</span>
        <span className="text-amber-500" aria-label={`${r.rating} of 5`}>
          {'★'.repeat(r.rating)}
          <span className="text-gray-300">{'★'.repeat(5 - r.rating)}</span>
        </span>
        <span className="text-ink-muted">{r.reviewer_phone}</span>
        {r.same_phone > 1 && <Badge tone="orange">{r.same_phone} reviews from this number</Badge>}
        {r.is_hidden && <Badge tone="red">Hidden{r.hidden_reason ? `: ${r.hidden_reason}` : ''}</Badge>}
        {showAd && (
          <Link href={`/admin/listings/${r.listing_id}`} className="text-brand hover:underline">
            {r.reference} · {r.title}
          </Link>
        )}
      </p>
      {r.comment && <p className="mt-1">“{r.comment}”</p>}
      {r.provider_reply && (
        <p className="mt-1 rounded bg-page p-2">
          <span className="font-semibold">Reply: </span>
          {r.provider_reply}
        </p>
      )}
      <p className="mt-1 text-xs text-ink-muted">{new Date(r.created_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <form action={setReviewHidden} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="back" value={back} />
          <input type="hidden" name="hide" value={r.is_hidden ? 'false' : 'true'} />
          {!r.is_hidden && (
            <>
              <label htmlFor={`reason-${r.id}`} className="sr-only">
                Reason
              </label>
              <input id={`reason-${r.id}`} name="reason" placeholder="Reason (fake, abusive…)" className="admin-input w-56" />
            </>
          )}
          <SubmitButton className={r.is_hidden ? 'btn-sm border border-line bg-white' : 'btn-danger'}>{r.is_hidden ? 'Show again' : 'Hide review'}</SubmitButton>
        </form>
        {r.provider_reply && (
          <form action={clearReply}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="back" value={back} />
            <SubmitButton className="btn-sm border border-line bg-white" confirm="Remove the provider's reply?">
              Remove reply
            </SubmitButton>
          </form>
        )}
      </div>
    </li>
  );
}
