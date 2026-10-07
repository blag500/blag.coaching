-- Новите поръчки пристигат в панела на треньора на живо. Realtime спазва
-- правилата на таблицата: събитията стигат само до собственика (126).
alter publication supabase_realtime add table public.cheatcode_orders;
