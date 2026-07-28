-- 074_reminder_settings_update.sql
-- Add master email toggle + coach write access
-- Default: all reminders OFF (opt-in)

alter table public.reminder_settings
  add column if not exists email_enabled boolean not null default false;

-- Change all individual reminder defaults to false
alter table public.reminder_settings alter column weight_email      set default false;
alter table public.reminder_settings alter column habits_email      set default false;
alter table public.reminder_settings alter column supplements_email set default false;
alter table public.reminder_settings alter column water_email       set default false;
alter table public.reminder_settings alter column food_email        set default false;
alter table public.reminder_settings alter column training_email    set default false;

-- Insert all-off rows for existing clients who don't have a row yet
insert into public.reminder_settings (user_id, email_enabled, weight_email, habits_email, supplements_email, water_email, food_email, training_email)
select id, false, false, false, false, false, false, false
from public.profiles
where role = 'client'
on conflict (user_id) do nothing;

-- Coach can manage any client's reminder settings
drop policy if exists "reminder_settings_coach_write" on public.reminder_settings;
create policy "reminder_settings_coach_write" on public.reminder_settings
  for all using (
    (select role from public.profiles where id = auth.uid()) = 'coach'
  ) with check (
    (select role from public.profiles where id = auth.uid()) = 'coach'
  );
