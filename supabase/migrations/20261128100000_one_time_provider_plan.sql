-- Service providers and businesses: one-time fee, no renewal (listing runs 10 years).
-- Business Rs 2,000, service providers Rs 1,000. Ads already posted are not changed.
update pricing set duration_days = 3650, price = 1000 where model = 'services' and category_id is null and duration_days = 60;
update pricing set duration_days = 3650, price = 2000 where model = 'business' and category_id is null and duration_days = 60;
insert into pricing (model, duration_days, price)
  select m, 3650, p from (values ('services'::model_type, 1000), ('business'::model_type, 2000)) v(m, p)
  where not exists (select 1 from pricing x where x.model = v.m and x.category_id is null and x.duration_days = 3650);
-- category-specific prices for 2 months become one-time prices too
update pricing set duration_days = 3650 where model in ('services', 'business') and category_id is not null and duration_days = 60;
-- Free Mode: free service / business listings also last
update site_settings
   set value = jsonb_set(jsonb_set(value, '{days_by_model,services}', '3650'), '{days_by_model,business}', '3650')
 where key = 'public.free_mode';
