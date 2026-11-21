-- Security hardening before launch

-- 1) Admin login lockout kept in the database (works across all server copies on Vercel)
create table if not exists admin_login_attempts (
  key text primary key,                     -- 'email:<email>' or 'ip:<address>'
  failures int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table admin_login_attempts enable row level security;

-- 2) Secret manage code for sellers (needed to mark sold / reply to reviews).
--    Only a hash is stored; the code itself is shown once to the seller.
alter table listings add column if not exists manage_key_hash text;

-- 3) Fake / reused payment protection
alter table payments add column if not exists screenshot_hash text;
alter table payments add column if not exists transaction_key text;  -- normalised TID (upper case, no spaces)
update payments set transaction_key = upper(regexp_replace(transaction_id, '\s|-', '', 'g')) where transaction_id is not null and transaction_key is null;
create index if not exists payments_transaction_key_idx on payments (method, transaction_key) where transaction_key is not null;
create index if not exists payments_screenshot_hash_idx on payments (screenshot_hash) where screenshot_hash is not null;

-- 4) Row Level Security on every public table (no public policies: the website reads
--    through the server only, so the public Supabase API can never read these tables)
do $$
declare t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity loop
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end $$;

-- 5) Remove every "public read" policy. The website and app read only through the
--    server (direct database connection), so the public Supabase API needs no access.
--    Without this, the anon key could read seller phone numbers and reviewer phones.
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
