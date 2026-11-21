-- Contact form messages (Contact Us page)
create table if not exists contact_messages (
  id bigint generated always as identity primary key,
  name text not null,
  phone text,
  email text,
  subject text,
  message text not null,
  locale text not null default 'en',
  status text not null default 'new' check (status in ('new', 'replied', 'closed')),
  handled_by uuid references admin_users(id),
  created_at timestamptz not null default now()
);
alter table contact_messages enable row level security;
