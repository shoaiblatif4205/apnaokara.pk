-- =====================================================================
-- Phase 7: Rishta (private matrimonial section)
-- =====================================================================

-- One-time login codes (stored hashed). Locally the code is shown on screen;
-- on the live site it is sent by SMS / WhatsApp.
create table if not exists rishta_otps (
  id bigint generated always as identity primary key,
  phone text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists rishta_otps_phone_idx on rishta_otps (phone, created_at desc);
alter table rishta_otps enable row level security;

-- Profile extras
alter table rishta_profiles add column if not exists full_name text;            -- private, never shown to members
alter table rishta_profiles add column if not exists views int not null default 0;
alter table rishta_profiles add column if not exists last_active_at timestamptz;
alter table rishta_profiles add column if not exists hidden_reason text;
create index if not exists rishta_profiles_search_idx on rishta_profiles (status, gender, date_of_birth);

-- Photos: original (private), watermarked and blurred versions
alter table rishta_photos add column if not exists watermarked_path text;
alter table rishta_photos add column if not exists blurred_path text;
alter table rishta_photos add column if not exists sort_order int not null default 0;
alter table rishta_photos add column if not exists is_rejected boolean not null default false;

-- Interests: photo sharing after acceptance
alter table rishta_interests add column if not exists photos_shared_by_receiver boolean not null default false;
alter table rishta_interests add column if not exists photos_shared_by_sender boolean not null default false;
alter table rishta_interests add column if not exists mediation_note text;
alter table rishta_interests add column if not exists mediation_status text check (mediation_status in ('open', 'in_progress', 'done'));
alter table rishta_interests add column if not exists handled_by uuid references admin_users(id);

-- Success stories (only with permission of both families; added by admin)
create table if not exists rishta_stories (
  id int generated always as identity primary key,
  title_en text not null,
  title_ur text not null,
  body_en text not null default '',
  body_ur text not null default '',
  city text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table rishta_stories enable row level security;
create policy "public read rishta stories" on rishta_stories for select using (is_published);

-- Plan settings (admin editable)
update site_settings set value = value
  || jsonb_build_object('premium_price', coalesce(value->'premium_price', 'null'::jsonb))
  || jsonb_build_object('premium_days', coalesce(value->'premium_days', '90'::jsonb))
  || jsonb_build_object('interests_per_day', coalesce(value->'interests_per_day', '10'::jsonb))
  || jsonb_build_object('premium_interests_per_day', coalesce(value->'premium_interests_per_day', '30'::jsonb))
  || jsonb_build_object('coordinator_fee', coalesce(value->'coordinator_fee', 'null'::jsonb))
  where key = 'public.rishta_plan';
insert into site_settings (key, value) values ('public.rishta_plan', '{"days":90,"price":1000,"premium_price":null,"premium_days":90,"interests_per_day":10,"premium_interests_per_day":30,"coordinator_fee":null}')
  on conflict (key) do nothing;
update site_settings set value = '{"enabled": false, "days": 90}' where key = 'public.rishta_free_mode' and not (value ? 'days');
