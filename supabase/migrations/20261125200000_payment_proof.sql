-- Fake / reused payment protection
-- transaction_key: the transaction ID cleaned up (upper case, only letters and digits)
-- screenshot_hash: fingerprint of the screenshot (it is part of the file name)
create or replace function payments_fill_proof() returns trigger language plpgsql as $$
begin
  new.transaction_key := nullif(upper(regexp_replace(coalesce(new.transaction_id, ''), '[^A-Za-z0-9]', '', 'g')), '');
  new.screenshot_hash := substring(coalesce(new.screenshot_path, '') from '([0-9a-f]{40})\.webp$');
  return new;
end $$;

drop trigger if exists payments_fill_proof on payments;
create trigger payments_fill_proof before insert or update of transaction_id, screenshot_path on payments
  for each row execute function payments_fill_proof();

update payments set transaction_id = transaction_id;  -- fill the new columns for old rows

-- Older duplicates (same method + transaction ID, still open): keep the first, reject the rest
update payments p set status = 'rejected', reject_reason = coalesce(p.reject_reason, 'Duplicate transaction ID (rejected automatically)')
 where p.transaction_key is not null and p.status in ('pending', 'verified')
   and exists (select 1 from payments o where o.method = p.method and o.transaction_key = p.transaction_key
                  and o.status in ('pending', 'verified') and o.created_at < p.created_at);

-- The same transaction ID can never be open / accepted twice (a rejected one may be sent again)
create unique index if not exists payments_one_open_per_tid on payments (method, transaction_key)
  where transaction_key is not null and status in ('pending', 'verified');
