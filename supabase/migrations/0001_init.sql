-- supabase/migrations/0001_init.sql

create extension if not exists "pgcrypto";

create table guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  salutation text,
  greeting_message text,
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending', 'attending', 'not_attending')),
  rsvp_responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table event_settings (
  id int primary key default 1,
  event_name text,
  event_datetime timestamptz,
  venue_name text,
  venue_address text,
  map_embed_url text,
  cover_image_url text,
  constraint single_row check (id = 1)
);

insert into event_settings (id) values (1);

create table gallery_photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table guests enable row level security;
alter table event_settings enable row level security;
alter table gallery_photos enable row level security;

create policy "guests_public_read" on guests for select using (true);
create policy "guests_admin_insert" on guests for insert with check (auth.role() = 'authenticated');
create policy "guests_admin_update" on guests for update using (auth.role() = 'authenticated');
create policy "guests_admin_delete" on guests for delete using (auth.role() = 'authenticated');

create policy "event_settings_public_read" on event_settings for select using (true);
create policy "event_settings_admin_update" on event_settings for update using (auth.role() = 'authenticated');

create policy "gallery_public_read" on gallery_photos for select using (true);
create policy "gallery_admin_insert" on gallery_photos for insert with check (auth.role() = 'authenticated');
create policy "gallery_admin_delete" on gallery_photos for delete using (auth.role() = 'authenticated');

create or replace function submit_rsvp(guest_id uuid, status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if status not in ('attending', 'not_attending') then
    raise exception 'invalid status';
  end if;

  update guests
  set rsvp_status = status,
      rsvp_responded_at = now(),
      updated_at = now()
  where id = guest_id;
end;
$$;

grant execute on function submit_rsvp(uuid, text) to anon;
