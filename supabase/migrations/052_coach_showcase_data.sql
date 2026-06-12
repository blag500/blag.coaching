-- Allow clients to read the coach's personal tracking data
-- so it can appear in the ВДЪХНОВЕНИЕ (showcase/inspiration) page.

-- Workout completions: clients can see coach's training history
do $$ begin
  create policy "clients view coach workout completions"
    on public.workout_completions for select
    using (user_id = get_coach_id());
exception when duplicate_object then null; end $$;

-- Habit completions: clients can see coach's daily habits
do $$ begin
  create policy "clients view coach habit completions"
    on public.habit_completions for select
    using (user_id = get_coach_id());
exception when duplicate_object then null; end $$;

-- Food logs: clients can see coach's nutrition logs
do $$ begin
  create policy "clients view coach food logs"
    on public.food_logs for select
    using (user_id = get_coach_id());
exception when duplicate_object then null; end $$;

-- Form check-ins: clients can see coach's check-in photos + data
do $$ begin
  create policy "clients view coach form checkins"
    on public.form_checkins for select
    using (user_id = get_coach_id());
exception when duplicate_object then null; end $$;

-- Sleep logs: clients can see coach's sleep/recovery data
do $$ begin
  create policy "clients view coach sleep logs"
    on public.sleep_logs for select
    using (user_id = get_coach_id());
exception when duplicate_object then null; end $$;
