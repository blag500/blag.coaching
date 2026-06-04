-- Allow any coach to read all clients' form check-ins
do $$ begin
  create policy "Coach reads client check-ins"
    on public.form_checkins for select
    using (get_my_role() = 'coach');
exception when duplicate_object then null;
end $$;
