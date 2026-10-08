-- Поръчката се потвърждава от имейла на клиента.
--
-- Вместо акаунт: имейлът е задължителен, а поръчката стига до кухнята чак
-- когато човекът натисне „Потвърди поръчката“ в писмото. Така имейлът е
-- доказано негов — и линкът към „Моите поръчки“, и писмото „готова“ отиват
-- на истински адрес — а фалшива поръчка с чужд телефон не звъни на Николай.
--
-- `confirm_hash` е отпечатъкът (sha256) на ключа от писмото, не самият ключ.
-- `confirmed_at` е празно, докато поръчката не е потвърдена; панелът на
-- собственика и известието виждат само потвърдените. Старите поръчки се
-- броят за потвърдени — тогава потвърждение нямаше.

alter table public.cheatcode_orders
  add column if not exists confirm_hash text,
  add column if not exists confirmed_at timestamptz;

update public.cheatcode_orders set confirmed_at = created_at where confirmed_at is null;

create unique index if not exists cheatcode_orders_confirm_idx
  on public.cheatcode_orders (confirm_hash) where confirm_hash is not null;
