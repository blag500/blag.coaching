-- Coach can toggle an update notice that all clients see
alter table public.profiles
  add column if not exists update_notice boolean not null default false;

-- Clients need to read the coach's profile for this flag
-- Policy "clients_view_coach_profile" from 053 already covers SELECT on profiles
-- so no extra policy needed.
