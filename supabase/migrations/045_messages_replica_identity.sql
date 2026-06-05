-- 045_messages_replica_identity.sql
-- Supabase Realtime filters on non-PK columns (e.g. to_user_id) require
-- REPLICA IDENTITY FULL so the full row is written to the WAL.
-- Without this, useUnread's `to_user_id=eq.X` filter never fires.
alter table public.messages replica identity full;
