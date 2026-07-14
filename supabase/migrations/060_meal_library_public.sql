-- 060_meal_library_public.sql
-- Make meal_library readable by all authenticated users.
-- Only the creator can insert/update/delete their own rows.

drop policy if exists "users own meal_library" on public.meal_library;

-- Everyone can read all meals
create policy "authenticated read meal_library"
  on public.meal_library for select
  using (auth.role() = 'authenticated');

-- Only creator can add / edit / delete their own
create policy "users insert meal_library"
  on public.meal_library for insert
  with check (auth.uid() = user_id);

create policy "users update meal_library"
  on public.meal_library for update
  using (auth.uid() = user_id);

create policy "users delete meal_library"
  on public.meal_library for delete
  using (auth.uid() = user_id);
