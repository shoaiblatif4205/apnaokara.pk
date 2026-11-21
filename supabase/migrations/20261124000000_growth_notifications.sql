-- Phase 10: push notifications, reminders, referrals, daily posts, backups

-- ---------- Push notifications (app) ----------
create table if not exists push_devices (
  id bigint generated always as identity primary key,
  token text unique not null,             -- Expo push token
  platform text not null default 'android' check (platform in ('android', 'ios', 'web')),
  locale text not null default 'ur' check (locale in ('en', 'ur')),
  notify_ads boolean not null default true,        -- my ads: approved / rejected / expiring
  notify_follows boolean not null default true,    -- new ads in followed categories
  notify_rishta boolean not null default true,
  is_active boolean not null default true,         -- false when Expo says the token is dead
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Ads this device posted / manages (proved with reference + phone)
create table if not exists push_device_listings (
  device_id bigint not null references push_devices(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  primary key (device_id, listing_id)
);

-- "Tell me about new ads in Mobiles in Okara"
create table if not exists push_follows (
  id bigint generated always as identity primary key,
  device_id bigint not null references push_devices(id) on delete cascade,
  category_id int not null references categories(id) on delete cascade,
  city_id int references cities(id) on delete cascade,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (device_id, category_id, city_id)
);

create table if not exists push_device_rishta (
  device_id bigint not null references push_devices(id) on delete cascade,
  account_id uuid not null references rishta_accounts(id) on delete cascade,
  primary key (device_id, account_id)
);

-- Outbox: every push is written here first, then sent (and kept as a record)
create table if not exists push_messages (
  id bigint generated always as identity primary key,
  device_id bigint not null references push_devices(id) on delete cascade,
  kind text not null,                     -- ad_approved, ad_rejected, ad_expiring, follow_new, rishta_interest, rishta_accepted, broadcast
  title text not null,
  body text not null,
  data jsonb not null default '{}',       -- { url: "/ad/..." } opened when tapped
  dedupe_key text unique,                 -- stops the same message twice
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'dry_run')),
  error text,
  ticket_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists push_messages_queue_idx on push_messages (created_at) where status = 'queued';

alter table push_devices enable row level security;
alter table push_device_listings enable row level security;
alter table push_follows enable row level security;
alter table push_device_rishta enable row level security;
alter table push_messages enable row level security;

-- ---------- Expiry reminders ----------
create table if not exists listing_reminders (
  id bigint generated always as identity primary key,
  listing_id uuid not null references listings(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'push')),
  kind text not null default 'expiring' check (kind in ('expiring', 'expired')),
  sent_by uuid references admin_users(id),
  created_at timestamptz not null default now()
);
create index if not exists listing_reminders_listing_idx on listing_reminders (listing_id);
alter table listing_reminders enable row level security;

-- ---------- Referrals ----------
create table if not exists referral_codes (
  phone text primary key,
  code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  id bigint generated always as identity primary key,
  referrer_phone text not null references referral_codes(phone),
  referred_phone text not null,
  listing_id uuid references listings(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'qualified', 'rejected')),
  reject_reason text,
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  unique (referred_phone)                 -- a new member can be referred only once
);
create index if not exists referrals_referrer_idx on referrals (referrer_phone, status);

create table if not exists referral_rewards (
  id bigint generated always as identity primary key,
  phone text not null references referral_codes(phone),
  promo_code_id int not null references promo_codes(id),
  referrals_used int not null,
  created_at timestamptz not null default now()
);

alter table referral_codes enable row level security;
alter table referrals enable row level security;
alter table referral_rewards enable row level security;

-- A promo code can be locked to one phone (referral rewards)
alter table promo_codes add column if not exists only_phone text;

insert into site_settings (key, value) values
  ('public.referral', '{"enabled": true, "needed": 5, "reward_days": 7}'),
  ('public.push', '{"follow_gap_hours": 6, "expiring_hours": 48}')
on conflict (key) do nothing;

-- ---------- Backups ----------
create table if not exists backups (
  id bigint generated always as identity primary key,
  file_name text not null,
  size_bytes bigint,
  status text not null default 'done' check (status in ('done', 'failed')),
  error text,
  started_by uuid references admin_users(id),  -- null = automatic daily backup
  created_at timestamptz not null default now()
);
alter table backups enable row level security;
