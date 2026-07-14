-- Migration: Add submit_guest_message RPC so anonymous guests can save their message
-- Date: 2026-07-14
--
-- guests_admin_update only allows authenticated (admin) updates, so the guest-facing
-- "message_by_guest" write from the public invite page was silently rejected by RLS.
-- Mirrors submit_rsvp's security definer pattern to bypass RLS safely for this one column.

create or replace function submit_guest_message(guest_id uuid, msg text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update guests
  set message_by_guest = msg,
      updated_at = now()
  where id = guest_id;
end;
$$;

grant execute on function submit_guest_message(uuid, text) to anon;
