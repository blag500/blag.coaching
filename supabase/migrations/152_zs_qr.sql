-- 152_zs_qr.sql
-- Личният QR (27.11.2026): всеки номер получава от базата свой QR номер
-- (qr_id), и вратата се отваря, когато четецът при вратата прочете този QR —
-- не с бутон отдалеч. Така знаем чий е всеки QR и кога е ползван.
--
-- QR-ът не е снимка за споделяне: на екрана се сменя на 30 секунди
-- (ZS1.<qr_id>.<прозорец>.<подпис>), подписан с ключа на телефона. Един
-- прозорец отваря веднъж. Снимка на екрана след минута не върши работа.
--
-- Един номер — един активен телефон: новата регистрация гаси старите.

alter table public.zs_customers
  add column if not exists qr_id text;

update public.zs_customers
   set qr_id = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
 where qr_id is null;

alter table public.zs_customers
  alter column qr_id set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  alter column qr_id set not null;

create unique index if not exists zs_customers_qr on public.zs_customers (qr_id);

alter table public.zs_devices
  add column if not exists last_qr_window bigint;      -- последният приет 30-секунден прозорец

alter table public.zs_entries
  add column if not exists method text not null default 'button',  -- qr | button
  add column if not exists reader text;                             -- кой четец (sim, door-1 …)
