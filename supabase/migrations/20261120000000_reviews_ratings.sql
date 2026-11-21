-- =====================================================================
-- Phase 5: ratings and reviews for service providers and businesses
-- =====================================================================

-- Review moderation details
alter table reviews add column if not exists provider_reply_at timestamptz;
alter table reviews add column if not exists hidden_reason text;
alter table reviews add column if not exists hidden_by uuid references admin_users(id);
create index if not exists reviews_listing_idx on reviews (listing_id, created_at desc);

-- Keep listings.rating_avg / rating_count correct (only visible reviews count)
create or replace function refresh_listing_rating(p_listing uuid) returns void
language sql as $$
  update listings l set
    rating_avg = coalesce((select round(avg(rating)::numeric, 1) from reviews r where r.listing_id = p_listing and not r.is_hidden), 0),
    rating_count = (select count(*) from reviews r where r.listing_id = p_listing and not r.is_hidden)
  where l.id = p_listing;
$$;

create or replace function reviews_after_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_listing_rating(old.listing_id);
    return old;
  end if;
  perform refresh_listing_rating(new.listing_id);
  return new;
end $$;

drop trigger if exists reviews_rating_refresh on reviews;
create trigger reviews_rating_refresh after insert or update or delete on reviews
  for each row execute function reviews_after_change();

-- Verified badge history
alter table listings add column if not exists verified_at timestamptz;
alter table listings add column if not exists verified_by uuid references admin_users(id);
