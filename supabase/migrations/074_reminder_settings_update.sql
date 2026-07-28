-- 074_reminder_settings_update.sql
-- Add master email toggle + coach write access

alter table public.reminder_settings
  add column if not exists email_enabled boolean not null default true;

-- Coach can manage any client's reminder settings
create policy "reminder_settings_coach_write" on public.reminder_settings
  for all using (
    (select role from public.profiles where id = auth.uid()) = 'coach'
  ) with check (
    (select role from public.profiles where id = auth.uid()) = 'coach'
  );
