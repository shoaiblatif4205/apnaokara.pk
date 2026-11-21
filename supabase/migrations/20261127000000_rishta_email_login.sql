-- Rishta login by email code (phone number still required and kept on the account)
alter table rishta_accounts add column if not exists email text;
create unique index if not exists rishta_accounts_email_key on rishta_accounts (lower(email)) where email is not null;
alter table rishta_otps add column if not exists email text;
alter table rishta_otps alter column phone drop not null;
create index if not exists rishta_otps_email_idx on rishta_otps (lower(email), created_at desc) where email is not null;
