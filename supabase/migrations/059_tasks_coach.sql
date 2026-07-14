-- 059_tasks_coach.sql
-- Add coach-push support to tasks: created_by column + policies + RPC

alter table public.tasks
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- Coaches can read all tasks (to view client task lists in ClientDetail)
create policy "coach reads all tasks"
  on public.tasks for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

-- Coaches can delete tasks they created (to manage pushed tasks)
create policy "coach deletes created tasks"
  on public.tasks for delete
  using (auth.uid() = created_by);

-- RPC: coach pushes a task to a specific client
create or replace function public.create_task_for_client(
  p_client_id uuid,
  p_text      text,
  p_due_date  date     default null,
  p_priority  smallint default 1
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid := auth.uid();
  v_task     public.tasks;
begin
  if not exists (
    select 1 from profiles where id = v_coach_id and role = 'coach'
  ) then
    raise exception 'caller is not a coach';
  end if;

  insert into tasks (user_id, created_by, text, due_date, priority, category)
  values (p_client_id, v_coach_id, p_text, p_due_date, p_priority, 'coach')
  returning * into v_task;

  return v_task;
end;
$$;

grant execute on function public.create_task_for_client(uuid, text, date, smallint) to authenticated;
