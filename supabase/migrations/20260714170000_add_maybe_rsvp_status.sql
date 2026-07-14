-- Migration: Allow 'maybe' as a third RSVP status ("Để sau")
-- Date: 2026-07-14

alter table guests drop constraint guests_rsvp_status_check;
alter table guests add constraint guests_rsvp_status_check
  check (rsvp_status in ('pending', 'attending', 'not_attending', 'maybe'));

create or replace function submit_rsvp(guest_id uuid, status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if status not in ('attending', 'not_attending', 'maybe') then
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
