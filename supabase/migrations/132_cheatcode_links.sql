-- „Моите поръчки“ на всеки телефон — по имейл, без акаунти.
--
-- Човекът пише имейла си и получава линк; линкът отваря поръчките му на
-- който и да е телефон, а телефонът го помни. Без потвърждение по имейл
-- всеки би видял чуждите поръчки (име, телефон), като напише чужд адрес.
--
-- Не са акаунти в Supabase Auth нарочно: handle_new_user (062) прави профил
-- на клиент в Blag за всяка регистрация — купувачите на обяд щяха да станат
-- клиенти на коучинга. Тук е само таблица с линкове.
--
-- В базата стои отпечатъкът на линка (sha256), не самият линк: изтекла
-- таблица не отваря ничии поръчки. Чете и пише само service role.

create table if not exists public.cheatcode_links (
  token_hash   text primary key,
  email        text not null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  expires_at   timestamptz not null default now() + interval '180 days'
);
create index if not exists cheatcode_links_email_idx on public.cheatcode_links (email, created_at desc);
alter table public.cheatcode_links enable row level security;

create index if not exists cheatcode_orders_email_idx on public.cheatcode_orders (email, created_at desc)
  where email is not null;

-- Писмо и при самата поръчка: „приета е“, с линка към поръчките. Който
-- поръча с имейл, получава профила, без да го иска отделно.
create or replace function public.cheatcode_order_mail()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null
     or new.status not in ('new', 'ready', 'cancelled')
     or new.status = any(new.mailed) then
    return new;
  end if;
  -- „Приета“ е само при вписването. „Върни“ в панела също слага 'new', но
  -- това не е нова поръчка и писмо не иска.
  if tg_op = 'UPDATE' and (new.status is not distinct from old.status or new.status = 'new') then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://eiltoadzaqbuqdilsfpi.supabase.co/functions/v1/cheatcode-mail',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-bot-secret', (select value from public.app_secrets where name = 'reminder')
    ),
    body    := jsonb_build_object('id', new.id, 'status', new.status),
    timeout_milliseconds := 15000
  );
  return new;
end;
$$;

drop trigger if exists cheatcode_order_mail_new on public.cheatcode_orders;
create trigger cheatcode_order_mail_new
  after insert on public.cheatcode_orders
  for each row execute function public.cheatcode_order_mail();
