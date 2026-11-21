-- =====================================================================
-- LOCAL DEVELOPMENT ONLY. Never run this on Supabase.
--
-- Supabase gives every project an `auth` schema (logins), a `storage`
-- schema (files) and the roles anon / authenticated / service_role.
-- Plain PostgreSQL does not have them, so this file creates small
-- stand-ins. That way supabase/migrations/*.sql runs UNCHANGED here and
-- later on Supabase.
-- =====================================================================

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

-- Logins (local stand-in for Supabase Auth)
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text unique,
  encrypted_password text,          -- bcrypt hash, set by the app
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now()
);

-- Same contract as Supabase: the current user's id from the request
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- Files (local stand-in for Supabase Storage; files saved on disk)
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);
