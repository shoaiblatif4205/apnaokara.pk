-- =====================================================================
-- Rishta on the home page + Phase 8 (pages and blog)
-- =====================================================================

-- Home page Rishta section (after service providers)
insert into homepage_sections (key, is_enabled, sort_order)
select 'rishta', true, coalesce((select sort_order from homepage_sections where key = 'services'), 9) + 0
where not exists (select 1 from homepage_sections where key = 'rishta');
update homepage_sections set sort_order = sort_order + 1
 where key <> 'rishta' and sort_order >= (select sort_order from homepage_sections where key = 'rishta')
   and key not in ('top_bar', 'offer_bar', 'hero', 'trust_points', 'categories', 'featured', 'wide_banner', 'fresh_ads', 'seasonal', 'services');

-- Rishta preview for visitors (admin can switch off)
insert into site_settings (key, value) values ('public.rishta_preview', '{"enabled": true}') on conflict (key) do nothing;

-- Pages: when edited and by whom; which pages appear in the footer/app menu
alter table pages add column if not exists updated_by uuid references admin_users(id);
alter table pages add column if not exists needs_owner_content boolean not null default false;

-- Blog: Urdu/English pair, related ads, views, reading time
alter table blog_posts add column if not exists translation_of uuid references blog_posts(id);
alter table blog_posts add column if not exists related_category_id int references categories(id);
alter table blog_posts add column if not exists views int not null default 0;
alter table blog_posts add column if not exists reading_minutes int;
alter table blog_posts add column if not exists updated_by uuid references admin_users(id);
alter table blog_categories add column if not exists sort_order int not null default 0;
create index if not exists blog_posts_public_idx on blog_posts (locale, status, published_at desc);

insert into blog_categories (slug, name_en, name_ur, sort_order) values
  ('buying-selling', 'Buying and selling', 'خرید و فروخت', 1),
  ('safety', 'Safety tips', 'حفاظتی ہدایات', 2),
  ('property', 'Property and rent', 'پراپرٹی اور کرایہ', 3),
  ('vehicles', 'Vehicles', 'گاڑیاں', 4),
  ('mawaishi', 'Mawaishi and agriculture', 'مویشی اور زراعت', 5),
  ('jobs-services', 'Jobs and services', 'نوکریاں اور سروسز', 6),
  ('local-news', 'Okara local', 'اوکاڑہ کی خبریں', 7)
on conflict (slug) do nothing;

insert into authors (name, bio) select 'Apna Okara Team', 'The team behind Apna Okara.' where not exists (select 1 from authors);
