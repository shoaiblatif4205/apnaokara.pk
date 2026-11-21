-- Sample ads (show new visitors how the site looks). Clearly labelled, no contact buttons,
-- never in Google / sitemap, and they end by themselves like any ad.
alter table listings add column if not exists is_sample boolean not null default false;
