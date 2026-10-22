-- 141_shop_deals_rotate.sql — промоциите се сменят сами всяка седмица (22.10.2026).
--
-- Николай: „авторотация“. Всяка неделя в 20:00 UTC (22:00 зимно / 23:00 лятно)
-- rotate_shop_deals() слага промоциите за следващата седмица: от понеделник
-- 00:00 до неделя 23:59:59 по София. Правилата (Р18):
--   * по един продукт от вид, най-много 6 — витрината е разнообразна;
--   * не същите като миналата седмица;
--   * сред останалите — най-високият марж (най-много място за намаление);
--   * цел −25 %, закръглено надолу до ,49/,99 (под 5 € — до ,x9);
--   * никога под доставната цена + 10 %; ако така намалението е под 10 % —
--     продуктът не влиза;
--   * was_cents е сегашната цена — цената преди намалението.
-- Цените на едро са в shop_supply и не излизат от базата.

create or replace function public.rotate_shop_deals(p_from timestamptz default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local timestamp;
  v_start timestamptz;
  v_end   timestamptz;
  v_n     integer;
begin
  -- Понеделникът 00:00 по София, който идва. Дните се броят в местно време,
  -- иначе седмицата със смяната на часа се изкривява с един час.
  v_local := date_trunc('week', (coalesce(p_from, now()) at time zone 'Europe/Sofia') + interval '1 day');
  if p_from is null and (v_local at time zone 'Europe/Sofia') <= now() then
    v_local := v_local + interval '7 days';
  end if;
  v_start := v_local at time zone 'Europe/Sofia';
  v_end := ((v_local + interval '7 days') at time zone 'Europe/Sofia') - interval '1 second';

  -- Изтеклите отпреди две седмици не трябват.
  delete from shop_deals where ends_at < now() - interval '14 days';

  with last_week as (
    select product_id from shop_deals where ends_at > v_start - interval '8 days' and ends_at <= v_start
  ), priced as (
    select p.id, p.category, p.price_cents as was,
           s.cost_cents as cost,
           (p.price_cents - s.cost_cents)::numeric / p.price_cents as margin,
           -- цел −25 %, закръглено надолу
           case when p.price_cents * 0.75 >= 500
                then floor(p.price_cents * 0.75 / 50) * 50 - 1
                else floor(p.price_cents * 0.75 / 10) * 10 - 1 end as target,
           -- дъното: доставната + 10 %, закръглено нагоре до ,x9
           ceil((ceil(s.cost_cents * 1.10) + 1) / 10.0) * 10 - 1 as floor_cents
    from shop_products p
    join shop_supply s on s.product_id = p.id
    where p.active
      and p.id not in (select product_id from last_week)
      and p.id not in (select product_id from shop_deals where ends_at > v_start)
  ), picked as (
    select id, category, was, greatest(target, floor_cents)::integer as deal, margin,
           row_number() over (partition by category order by margin desc, id) as rk
    from priced
  ), best as (
    select * from picked
    where rk = 1 and deal <= was * 0.90          -- поне 10 % намаление
    order by margin desc
    limit 6
  )
  insert into shop_deals (product_id, deal_price_cents, was_cents, starts_at, ends_at, sort)
  select id, deal, was, v_start, v_end, row_number() over (order by (1 - deal::numeric / was) desc)
  from best
  on conflict (product_id) do update set deal_price_cents = excluded.deal_price_cents, was_cents = excluded.was_cents,
    starts_at = excluded.starts_at, ends_at = excluded.ends_at, sort = excluded.sort;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.rotate_shop_deals(timestamptz) from public, anon, authenticated;

select cron.unschedule('rotate-shop-deals') where exists (select 1 from cron.job where jobname = 'rotate-shop-deals');
select cron.schedule('rotate-shop-deals', '0 20 * * 0', $$select public.rotate_shop_deals()$$);

-- Първата седмица (140) свършваше в понеделник 26.10 — 26.10.2026 е понеделник,
-- а промоцията е обявена „до неделя“. Оправено: неделя 25.10, 23:59:59.
update public.shop_deals set ends_at = '2026-10-25 23:59:59+02' where ends_at = '2026-10-26 23:59:59+02';
