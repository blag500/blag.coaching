-- Per-client customisable habits list stored as JSONB on profiles.
-- Format: [{"id": "water", "emoji": "💧", "label": "Вода 2.5L"}, ...]
-- NULL means "use the app default habit list".
alter table public.profiles add column if not exists habits jsonb;
