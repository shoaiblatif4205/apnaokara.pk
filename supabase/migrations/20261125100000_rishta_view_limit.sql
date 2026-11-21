-- Rishta: record which profiles a member opens (stops mass copying of girls' / boys' profiles)
create table if not exists rishta_profile_views (
  viewer_profile_id uuid not null references rishta_profiles(id) on delete cascade,
  viewed_profile_id uuid not null references rishta_profiles(id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Karachi')::date,
  created_at timestamptz not null default now(),
  primary key (viewer_profile_id, viewed_profile_id, day)
);
alter table rishta_profile_views enable row level security;
