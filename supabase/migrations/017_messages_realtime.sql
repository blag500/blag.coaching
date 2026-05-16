-- 017_messages_realtime.sql
-- Enable Supabase Realtime for the messages table so the chat subscription
-- receives INSERT events without requiring a manual refresh.
alter publication supabase_realtime add table public.messages;
