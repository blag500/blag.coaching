-- Поръчките на Чийт Код са на собственика, не на всеки треньор.
--
-- 125 ги даде на `get_my_role() = 'coach'`, но треньорските акаунти са два,
-- а редът носи име и телефон на клиент. Затова — като /invest/: собственикът
-- стои в cheatcode_owner, един ред, без нито едно правило. Само той чете и
-- мени поръчките и само на него отива известието (функцията cheatcode-order
-- чете таблицата със service role). Редът се слага на ръка:
--
--   insert into public.cheatcode_owner (user_id)
--   select id from auth.users where email = '...';

create table if not exists public.cheatcode_owner (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.cheatcode_owner enable row level security;

create or replace function public.is_cheatcode_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.cheatcode_owner where user_id = auth.uid())
$$;

drop policy if exists "coach reads orders" on public.cheatcode_orders;
drop policy if exists "coach updates orders" on public.cheatcode_orders;

drop policy if exists "owner reads orders" on public.cheatcode_orders;
create policy "owner reads orders" on public.cheatcode_orders
  for select using (public.is_cheatcode_owner());

drop policy if exists "owner updates orders" on public.cheatcode_orders;
create policy "owner updates orders" on public.cheatcode_orders
  for update using (public.is_cheatcode_owner()) with check (public.is_cheatcode_owner());
