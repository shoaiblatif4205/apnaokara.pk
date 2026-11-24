-- What the server read from each payment screenshot (OCR): payment date/time, amount, transaction ID.
-- Linked to payments by the screenshot fingerprint (payments.screenshot_hash).
create table if not exists payment_receipts (
  screenshot_hash text primary key,
  paid_at timestamptz,            -- date + time shown on the screenshot (Pakistan time converted)
  has_time boolean not null default false,
  amount int,                     -- amount shown on the screenshot
  transaction_id text,            -- transaction ID shown on the screenshot (cleaned: A-Z and 0-9)
  file_time timestamptz,          -- when the screenshot file was made, as the phone reports it
  ocr_text text,
  read_ok boolean not null default false,  -- false when OCR found nothing useful
  created_at timestamptz not null default now()
);
create index if not exists payment_receipts_tid_idx on payment_receipts (transaction_id) where transaction_id is not null;
alter table payment_receipts enable row level security;  -- server only, no public access

-- When the customer did not type a transaction ID, use the one read from the screenshot.
-- Then the existing rule "one open payment per transaction ID" also blocks reused payments.
create or replace function payments_fill_proof() returns trigger language plpgsql as $$
begin
  new.screenshot_hash := substring(coalesce(new.screenshot_path, '') from '([0-9a-f]{40})\.webp$');
  if coalesce(new.transaction_id, '') = '' and new.screenshot_hash is not null then
    select r.transaction_id into new.transaction_id from payment_receipts r where r.screenshot_hash = new.screenshot_hash;
  end if;
  new.transaction_key := nullif(upper(regexp_replace(coalesce(new.transaction_id, ''), '[^A-Za-z0-9]', '', 'g')), '');
  return new;
end $$;
