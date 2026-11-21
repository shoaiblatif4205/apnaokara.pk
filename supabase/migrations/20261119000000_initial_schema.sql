-- =====================================================================
-- Apna Okara: initial database schema (Phase 1)
-- Run in Supabase: SQL Editor -> paste -> Run   (or `supabase db push`)
--
-- Rules:
--  * Nothing is hard-deleted. Status columns control what the public sees.
--  * The website server and admin panel use the service role key, which
--    bypasses Row Level Security (RLS). The public (anon key) can only READ
--    what the policies below allow.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type model_type as enum ('buy_sell','vehicles','property','jobs','services','business');
create type listing_status as enum ('pending','approved','rejected','expired','removed','sold');
create type payment_status as enum ('pending','verified','rejected','free');
create type payment_method as enum ('jazzcash','easypaisa','bank','free');
create type admin_role as enum ('super_admin','moderator','blog_writer','rishta_coordinator');
create type field_type as enum ('text','number','select','boolean','year');
create type banner_status as enum ('pending','scheduled','running','paused','expired','rejected');
create type publish_status as enum ('draft','scheduled','published','archived');
create type rishta_status as enum ('pending','approved','rejected','expired','hidden','removed');
create type interest_status as enum ('sent','accepted','declined','withdrawn');

-- ---------------------------------------------------------------------
-- Helper: updated_at trigger
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Admin users and activity log
-- ---------------------------------------------------------------------
create table admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role admin_role not null default 'moderator',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function is_admin(required admin_role default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_users a
    where a.id = auth.uid() and a.is_active
      and (required is null or a.role = required or a.role = 'super_admin')
  );
$$;

create table activity_log (
  id bigint generated always as identity primary key,
  admin_id uuid references admin_users(id),
  action text not null,              -- e.g. 'listing.approve'
  entity text not null,              -- e.g. 'listings'
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on activity_log (entity, entity_id);

-- ---------------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------------
create table districts (
  id smallint generated always as identity primary key,
  slug text unique not null,
  name_en text not null,
  name_ur text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table cities (
  id smallint generated always as identity primary key,
  district_id smallint not null references districts(id),
  slug text unique not null,
  name_en text not null,
  name_ur text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table localities (
  id int generated always as identity primary key,
  city_id smallint not null references cities(id),
  slug text not null,
  name_en text not null,
  name_ur text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (city_id, slug)
);

-- ---------------------------------------------------------------------
-- Categories and category-specific fields
-- ---------------------------------------------------------------------
create table categories (
  id int generated always as identity primary key,
  parent_id int references categories(id),
  model model_type not null,
  slug text unique not null,
  name_en text not null,
  name_ur text not null,
  icon text,
  show_on_home boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now()
);
create index on categories (parent_id);

create table category_fields (
  id int generated always as identity primary key,
  category_id int not null references categories(id),
  key text not null,
  label_en text not null,
  label_ur text not null,
  type field_type not null,
  options jsonb,                     -- [{en,ur}] for select
  unit_en text,
  unit_ur text,
  is_required boolean not null default false,
  sort_order int not null default 0,
  unique (category_id, key)
);

-- ---------------------------------------------------------------------
-- Pricing and add-ons (admin editable)
-- ---------------------------------------------------------------------
create table pricing (
  id int generated always as identity primary key,
  model model_type,                  -- default price for a model
  category_id int references categories(id), -- override for one category
  duration_days int not null,
  price int not null check (price >= 0),
  is_active boolean not null default true,
  unique nulls not distinct (model, category_id, duration_days)
);

create table addons (
  key text primary key,              -- 'featured', 'whatsapp_boost'
  name_en text not null,
  name_ur text not null,
  price int not null check (price >= 0),
  is_active boolean not null default true
);

create table promo_codes (
  id int generated always as identity primary key,
  code text unique not null,
  discount_percent int check (discount_percent between 0 and 100),
  discount_amount int check (discount_amount >= 0),
  max_uses int,
  used_count int not null default 0,
  valid_from timestamptz,
  valid_to timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Listings (all 6 models: ads, service providers, businesses)
-- ---------------------------------------------------------------------
create sequence listing_ref_seq start 10001;

create table listings (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null default ('AO-' || nextval('listing_ref_seq')),
  model model_type not null,
  category_id int not null references categories(id),
  subcategory_id int references categories(id),
  slug text not null,
  title text not null check (char_length(title) between 5 and 120),
  description text not null default '',
  price int check (price >= 0),
  price_type text not null default 'fixed' check (price_type in ('fixed','negotiable','contact','free')),
  city_id smallint not null references cities(id),
  locality_id int references localities(id),
  custom_fields jsonb not null default '{}',

  -- seller / provider (never login; managed with reference + phone)
  seller_name text not null,
  seller_phone text not null,
  whatsapp_phone text,
  show_phone boolean not null default true,

  -- plan
  duration_days int not null,
  is_featured boolean not null default false,
  featured_until timestamptz,
  whatsapp_boost boolean not null default false,
  is_free boolean not null default false,       -- given free (Free Mode or admin)

  -- workflow
  status listing_status not null default 'pending',
  reject_reason text,
  approved_at timestamptz,
  approved_by uuid references admin_users(id),
  expires_at timestamptz,
  sold_at timestamptz,

  -- service provider / business extras
  is_verified boolean not null default false,
  rating_avg numeric(2,1) not null default 0,
  rating_count int not null default 0,

  views int not null default 0,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on listings (status, model, category_id, city_id);
create index on listings (status, is_featured, approved_at desc);
create index on listings (seller_phone);
create index on listings (expires_at) where status = 'approved';
create trigger listings_updated before update on listings for each row execute function set_updated_at();

create table listing_images (
  id bigint generated always as identity primary key,
  listing_id uuid not null references listings(id),
  storage_path text not null,
  sort_order int not null default 0,
  is_cover boolean not null default false,
  deleted_at timestamptz,            -- extra photos removed 30 days after expiry
  created_at timestamptz not null default now()
);
create index on listing_images (listing_id);

create table listing_history (
  id bigint generated always as identity primary key,
  listing_id uuid not null references listings(id),
  event text not null,               -- created, approved, rejected, extended, renewed, sold, expired...
  details jsonb not null default '{}',
  admin_id uuid references admin_users(id),
  created_at timestamptz not null default now()
);
create index on listing_history (listing_id);

-- ---------------------------------------------------------------------
-- Payments (kept forever)
-- ---------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('listing','renewal','featured','whatsapp_boost','banner','rishta')),
  listing_id uuid references listings(id),
  banner_id uuid,                    -- fk added after banners table
  rishta_profile_id uuid,            -- fk added after rishta table
  amount int not null check (amount >= 0),
  method payment_method not null,
  transaction_id text,
  paid_from text,                    -- name / number of payer
  screenshot_path text,
  promo_code_id int references promo_codes(id),
  status payment_status not null default 'pending',
  reject_reason text,
  verified_by uuid references admin_users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index on payments (status, created_at desc);
-- Warn on duplicate transaction IDs (same ID used twice = likely fraud)
create index on payments (lower(transaction_id));

-- ---------------------------------------------------------------------
-- Reviews (service providers and businesses)
-- ---------------------------------------------------------------------
create table reviews (
  id bigint generated always as identity primary key,
  listing_id uuid not null references listings(id),
  reviewer_name text not null,
  reviewer_phone text not null,      -- never public
  rating smallint not null check (rating between 1 and 5),
  comment text,
  provider_reply text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (listing_id, reviewer_phone)
);

-- ---------------------------------------------------------------------
-- Reports and blocklist
-- ---------------------------------------------------------------------
create table reports (
  id bigint generated always as identity primary key,
  listing_id uuid not null references listings(id),
  reason text not null check (reason in ('fraud','wrong_category','sold','offensive','duplicate','other')),
  details text,
  reporter_phone text,
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  handled_by uuid references admin_users(id),
  created_at timestamptz not null default now()
);

create table blocked_phones (
  phone text primary key,
  reason text,
  blocked_by uuid references admin_users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Banners (brand ads and our own hero slides / house banners)
-- ---------------------------------------------------------------------
create table banners (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('brand','house')),
  placement text not null check (placement in ('hero_slider','hero_side','home_strip','category_top','in_feed','ad_detail','app_home','popup')),
  business_name text,
  contact_name text,
  contact_phone text,
  title_en text,
  title_ur text,
  subtitle_en text,
  subtitle_ur text,
  button_en text,
  button_ur text,
  link_url text,
  image_desktop_path text,
  image_mobile_path text,
  target_city_ids smallint[],        -- null = all cities
  target_category_ids int[],         -- null = all categories
  target_platform text not null default 'both' check (target_platform in ('web','app','both')),
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order int not null default 0,
  status banner_status not null default 'pending',
  is_free boolean not null default false,
  needs_design boolean not null default false,
  stats_token text unique default encode(gen_random_bytes(12), 'hex'), -- private stats link for brand
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger banners_updated before update on banners for each row execute function set_updated_at();
alter table payments add constraint payments_banner_fk foreign key (banner_id) references banners(id);

create table banner_stats (
  banner_id uuid not null references banners(id),
  day date not null,
  views int not null default 0,
  clicks int not null default 0,
  primary key (banner_id, day)
);

-- ---------------------------------------------------------------------
-- Home page manager, static pages, SEO, settings
-- ---------------------------------------------------------------------
create table homepage_sections (
  key text primary key,              -- 'hero', 'categories', 'featured', ...
  title_en text,
  title_ur text,
  is_enabled boolean not null default true,
  sort_order int not null default 0,
  config jsonb not null default '{}'
);

create table pages (
  id int generated always as identity primary key,
  slug text unique not null,         -- 'about', 'terms', ...
  title_en text not null,
  title_ur text not null,
  body_en text not null default '',
  body_ur text not null default '',
  seo_title text,
  seo_description text,
  status publish_status not null default 'draft',
  updated_at timestamptz not null default now()
);
create trigger pages_updated before update on pages for each row execute function set_updated_at();

create table redirects (
  id int generated always as identity primary key,
  from_path text unique not null,
  to_path text not null,
  status_code smallint not null default 301
);

create table site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Blog
-- ---------------------------------------------------------------------
create table authors (
  id int generated always as identity primary key,
  name text not null,
  bio text,
  photo_path text
);

create table blog_categories (
  id int generated always as identity primary key,
  slug text unique not null,
  name_en text not null,
  name_ur text not null
);

create table blog_tags (
  id int generated always as identity primary key,
  slug text unique not null,
  name text not null
);

create table blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  locale text not null default 'en' check (locale in ('en','ur')),
  title text not null,
  excerpt text,
  body text not null default '',
  cover_path text,
  category_id int references blog_categories(id),
  author_id int references authors(id),
  faq jsonb not null default '[]',   -- [{q,a}] -> FAQPage schema
  seo_title text,
  seo_description text,
  focus_keyword text,
  noindex boolean not null default false,
  status publish_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger blog_posts_updated before update on blog_posts for each row execute function set_updated_at();

create table blog_post_tags (
  post_id uuid references blog_posts(id),
  tag_id int references blog_tags(id),
  primary key (post_id, tag_id)
);

-- ---------------------------------------------------------------------
-- Rishta (Phase 7). Strictly private: NO public policies.
-- ---------------------------------------------------------------------
create sequence rishta_ref_seq start 1001;

create table rishta_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table rishta_profiles (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null default ('R-' || nextval('rishta_ref_seq')),
  account_id uuid not null references rishta_accounts(id),
  created_by text not null check (created_by in ('self','parent','sibling','relative')),
  gender text not null check (gender in ('male','female')),
  date_of_birth date not null,       -- 18+ enforced by trigger below
  height_cm smallint,
  complexion text,
  marital_status text not null check (marital_status in ('never_married','divorced','widowed')),
  children smallint not null default 0,
  religion text,
  sect text,
  caste text,
  education text,
  profession text,
  income_range text,
  native_city_id smallint references cities(id),
  native_locality_id int references localities(id),
  current_city text,
  current_country text not null default 'Pakistan',
  house_type text check (house_type in ('own','rented','family')),
  father_profession text,
  mother_profession text,
  brothers smallint,
  sisters smallint,
  married_siblings smallint,
  family_type text check (family_type in ('joint','separate')),
  about text,
  looking_for jsonb not null default '{}',
  guardian_name text not null,        -- private
  guardian_phone text not null,       -- private
  is_premium boolean not null default false,
  premium_until timestamptz,
  status rishta_status not null default 'pending',
  reject_reason text,
  verified_by uuid references admin_users(id),
  approved_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger rishta_profiles_updated before update on rishta_profiles for each row execute function set_updated_at();

create or replace function rishta_check_age() returns trigger
language plpgsql as $$
begin
  if new.date_of_birth > (current_date - interval '18 years') then
    raise exception 'Rishta profile must be 18 years or older';
  end if;
  return new;
end $$;
create trigger rishta_profiles_age before insert or update of date_of_birth on rishta_profiles
  for each row execute function rishta_check_age();
alter table payments add constraint payments_rishta_fk foreign key (rishta_profile_id) references rishta_profiles(id);

create table rishta_photos (
  id bigint generated always as identity primary key,
  profile_id uuid not null references rishta_profiles(id),
  storage_path text not null,
  is_approved boolean not null default false,
  approved_by uuid references admin_users(id),
  created_at timestamptz not null default now()
);

create table rishta_photo_access (
  profile_id uuid references rishta_profiles(id),
  viewer_profile_id uuid references rishta_profiles(id),
  granted_at timestamptz not null default now(),
  primary key (profile_id, viewer_profile_id)
);

create table rishta_interests (
  id bigint generated always as identity primary key,
  from_profile_id uuid not null references rishta_profiles(id),
  to_profile_id uuid not null references rishta_profiles(id),
  status interest_status not null default 'sent',
  mediation_requested boolean not null default false,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (from_profile_id, to_profile_id),
  check (from_profile_id <> to_profile_id)
);

create table rishta_reports (
  id bigint generated always as identity primary key,
  profile_id uuid not null references rishta_profiles(id),
  reported_by uuid references rishta_profiles(id),
  reason text not null,
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  created_at timestamptz not null default now()
);

create table rishta_blocks (
  blocker_profile_id uuid references rishta_profiles(id),
  blocked_profile_id uuid references rishta_profiles(id),
  created_at timestamptz not null default now(),
  primary key (blocker_profile_id, blocked_profile_id)
);

-- ---------------------------------------------------------------------
-- Public views (safe columns only: never phone of hidden sellers etc.)
-- ---------------------------------------------------------------------
create view public_listings with (security_invoker = true) as
select
  l.id, l.reference, l.model, l.category_id, l.subcategory_id, l.slug, l.title,
  l.description, l.price, l.price_type, l.city_id, l.locality_id, l.custom_fields,
  l.seller_name,
  case when l.show_phone then l.seller_phone end as seller_phone,
  l.whatsapp_phone,
  l.is_featured and coalesce(l.featured_until > now(), true) as is_featured,
  l.is_verified, l.rating_avg, l.rating_count, l.views,
  l.approved_at, l.expires_at, l.created_at
from listings l
where l.status = 'approved' and (l.expires_at is null or l.expires_at > now());

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table admin_users enable row level security;
alter table activity_log enable row level security;
alter table districts enable row level security;
alter table cities enable row level security;
alter table localities enable row level security;
alter table categories enable row level security;
alter table category_fields enable row level security;
alter table pricing enable row level security;
alter table addons enable row level security;
alter table promo_codes enable row level security;
alter table listings enable row level security;
alter table listing_images enable row level security;
alter table listing_history enable row level security;
alter table payments enable row level security;
alter table reviews enable row level security;
alter table reports enable row level security;
alter table blocked_phones enable row level security;
alter table banners enable row level security;
alter table banner_stats enable row level security;
alter table homepage_sections enable row level security;
alter table pages enable row level security;
alter table redirects enable row level security;
alter table site_settings enable row level security;
alter table authors enable row level security;
alter table blog_categories enable row level security;
alter table blog_tags enable row level security;
alter table blog_posts enable row level security;
alter table blog_post_tags enable row level security;
alter table rishta_accounts enable row level security;
alter table rishta_profiles enable row level security;
alter table rishta_photos enable row level security;
alter table rishta_photo_access enable row level security;
alter table rishta_interests enable row level security;
alter table rishta_reports enable row level security;
alter table rishta_blocks enable row level security;

-- Public read: reference data
create policy "public read districts" on districts for select using (is_active);
create policy "public read cities" on cities for select using (is_active);
create policy "public read localities" on localities for select using (is_active);
create policy "public read categories" on categories for select using (is_active);
create policy "public read category_fields" on category_fields for select using (true);
create policy "public read pricing" on pricing for select using (is_active);
create policy "public read addons" on addons for select using (is_active);
create policy "public read homepage" on homepage_sections for select using (is_enabled);
create policy "public read pages" on pages for select using (status = 'published');
create policy "public read redirects" on redirects for select using (true);
create policy "public read blog categories" on blog_categories for select using (true);
create policy "public read blog tags" on blog_tags for select using (true);
create policy "public read authors" on authors for select using (true);
create policy "public read blog posts" on blog_posts for select using (status = 'published' and published_at <= now());
create policy "public read blog post tags" on blog_post_tags for select using (true);

-- Public settings only (keys starting with 'public.')
create policy "public read settings" on site_settings for select using (key like 'public.%');

-- Public read: live listings and their images
create policy "public read live listings" on listings for select
  using (status = 'approved' and (expires_at is null or expires_at > now()));
create policy "public read live listing images" on listing_images for select
  using (deleted_at is null and exists (
    select 1 from listings l where l.id = listing_id
      and l.status = 'approved' and (l.expires_at is null or l.expires_at > now())));
create policy "public read reviews" on reviews for select using (not is_hidden);

-- Running banners
create policy "public read running banners" on banners for select
  using (status = 'running' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));

-- Admins can read everything (writes go through the server with service role)
create policy "admin read listings" on listings for select using (is_admin());
create policy "admin read payments" on payments for select using (is_admin());
create policy "admin read history" on listing_history for select using (is_admin());
create policy "admin read reports" on reports for select using (is_admin());
create policy "admin read activity" on activity_log for select using (is_admin('super_admin'));
create policy "admin read self" on admin_users for select using (id = auth.uid() or is_admin('super_admin'));

-- Rishta: no public policies. Member policies are added in Phase 7.

-- ---------------------------------------------------------------------
-- Auto-expiry (runs hourly with pg_cron)
-- ---------------------------------------------------------------------
create or replace function expire_listings() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with expired as (
    update listings set status = 'expired'
    where status = 'approved' and expires_at is not null and expires_at <= now()
    returning id
  )
  insert into listing_history (listing_id, event)
  select id, 'expired' from expired;
  get diagnostics n = row_count;

  -- Featured flag ends with its own date
  update listings set is_featured = false
  where is_featured and featured_until is not null and featured_until <= now();

  -- Keep cover photo forever; mark other photos for deletion 30 days after expiry
  update listing_images i set deleted_at = now()
  from listings l
  where i.listing_id = l.id and l.status = 'expired' and not i.is_cover
    and i.deleted_at is null and l.expires_at <= now() - interval '30 days';

  -- Banners
  update banners set status = 'expired'
  where status in ('running','scheduled') and ends_at is not null and ends_at <= now();
  update banners set status = 'running'
  where status = 'scheduled' and (starts_at is null or starts_at <= now());

  -- Rishta profiles
  update rishta_profiles set status = 'expired'
  where status = 'approved' and expires_at is not null and expires_at <= now();

  return n;
end $$;

-- Enable pg_cron in Supabase: Database -> Extensions -> pg_cron, then run:
--   select cron.schedule('expire-listings', '0 * * * *', 'select expire_listings()');
