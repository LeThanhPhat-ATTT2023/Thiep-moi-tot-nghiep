-- Migration: Add public_invite_message column for the shared social invite flow (/chung-vui)
-- Date: 2026-07-15

alter table event_settings add column public_invite_message text;
