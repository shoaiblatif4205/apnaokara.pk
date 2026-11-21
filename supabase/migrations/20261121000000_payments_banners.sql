-- =====================================================================
-- Phase 6: Featured / WhatsApp Boost add-ons, promo codes, payment
-- details, banner prices and banner booking.
-- =====================================================================

-- Add-ons requested on an ad (applied when the payment is verified / ad approved)
alter table listings add column if not exists featured_requested boolean not null default false;
alter table listings add column if not exists boost_requested boolean not null default false;
alter table listings add column if not exists boost_done_at timestamptz;
alter table listings add column if not exists boost_done_by uuid references admin_users(id);

-- What a payment covers, discount and promo code
alter table payments add column if not exists items jsonb not null default '[]';   -- [{key, label, amount}]
alter table payments add column if not exists subtotal int;
alter table payments add column if not exists discount int not null default 0;
alter table payments add column if not exists applied_at timestamptz;              -- effects applied (featured on, banner live…)

-- Promo codes: description and which purposes they work for
alter table promo_codes add column if not exists description text;
alter table promo_codes add column if not exists purposes text[];                   -- null = all
alter table promo_codes add column if not exists max_uses_per_phone int;
create table if not exists promo_code_uses (
  id bigint generated always as identity primary key,
  promo_code_id int not null references promo_codes(id),
  payment_id uuid references payments(id),
  phone text,
  created_at timestamptz not null default now()
);

-- Banner prices (set by admin) per placement and number of days
create table if not exists banner_pricing (
  id int generated always as identity primary key,
  placement text not null,
  days int not null check (days > 0),
  price int not null check (price >= 0),
  is_active boolean not null default true,
  unique (placement, days)
);
alter table banner_pricing enable row level security;
create policy "public read banner pricing" on banner_pricing for select using (is_active);

-- Banner booking details
alter table banners add column if not exists days int;
alter table banners add column if not exists price int;
alter table banners add column if not exists reject_reason text;
alter table banners add column if not exists contact_whatsapp text;
alter table banners add column if not exists approved_by uuid references admin_users(id);
alter table banners add column if not exists approved_at timestamptz;

-- Design service price + banner rules live in site_settings (public.banner_settings)
insert into site_settings (key, value)
values ('public.banner_settings', '{"design_price": null, "popup_enabled": false, "max_per_placement": 5}')
on conflict (key) do nothing;

-- Count a banner view (called in batches by the website)
create or replace function add_banner_views(p_ids uuid[]) returns void
language sql as $$
  insert into banner_stats (banner_id, day, views)
  select id, (now() at time zone 'Asia/Karachi')::date, 1 from unnest(p_ids) as id
  on conflict (banner_id, day) do update set views = banner_stats.views + 1;
$$;
