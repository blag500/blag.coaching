-- Функциите, които минаваха без вход (проверката на Supabase, 07.10.2026).
--
-- approve_client: проверката беше `role != 'coach'`. Без вход ролята е NULL,
-- а `NULL != 'coach'` в SQL не е „вярно" — изключението не се вдигаше и всеки
-- с публичния ключ можеше да одобри който и да е клиент. Проверено преди
-- поправката: анонимно извикване → 204.
--
-- get_all_coaches даваше имената и имейлите на треньорите на всеки. Ползва се
-- само от панела на треньора, след вход — сега връща нещо само на треньор.
--
-- Останалите четат и пишат само данните на извикващия (auth.uid()) и без
-- вход не правеха нищо; затварят се за анонимни все пак. email_status остава
-- отворен — трябва при регистрация, преди вход. get_my_role, get_coach_id и
-- is_*_owner остават: ползват се в правилата на таблиците и казват нещо само
-- за самия извикващ.

create or replace function public.approve_client(client_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- coalesce: без вход ролята е NULL и сравнението трябва да откаже, не да мине.
  if coalesce((select role from public.profiles where id = auth.uid()), '') <> 'coach' then
    raise exception 'forbidden';
  end if;
  update public.profiles set plan_pending = false, approved = true
   where id = client_id and role = 'client';
end;
$function$;

create or replace function public.get_all_coaches()
returns table(id uuid, name text, email text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.id, p.name, p.email
    from public.profiles p
   where p.role = 'coach'
     and exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'coach')
   order by p.name;
$function$;

revoke execute on function public.approve_client(uuid)        from public, anon;
revoke execute on function public.get_all_coaches()           from public, anon;
revoke execute on function public.food_history(text)          from public, anon;
revoke execute on function public.forget_food(text)           from public, anon;
revoke execute on function public.rename_food(text, text)     from public, anon;
revoke execute on function public.select_plan(text)           from public, anon;
revoke execute on function public.handle_new_user()           from public, anon, authenticated;

grant execute on function public.approve_client(uuid)        to authenticated;
grant execute on function public.get_all_coaches()           to authenticated;
grant execute on function public.food_history(text)          to authenticated;
grant execute on function public.forget_food(text)           to authenticated;
grant execute on function public.rename_food(text, text)     to authenticated;
grant execute on function public.select_plan(text)           to authenticated;
