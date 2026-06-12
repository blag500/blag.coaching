-- Allow clients to read the coach's profile row (name, avatar_url, etc.)
-- Needed for chat header, ВДЪХНОВЕНИЕ page, and any client-facing coach display.
-- Multiple SELECT policies on the same table are combined with OR in Supabase.
do $$ begin
  create policy "clients view coach profile"
    on public.profiles for select
    using (
      get_my_role() = 'client'
      and id = get_coach_id()
    );
exception when duplicate_object then null; end $$;
