-- Private bucket for daily database backups (Admin -> Backups)
insert into storage.buckets (id, name, public) values ('backups', 'backups', false) on conflict (id) do nothing;
