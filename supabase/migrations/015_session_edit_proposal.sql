-- ============================================================
-- 015_session_edit_proposal.sql
-- Adds fields for client-proposed edits to existing sessions.
-- Coach edits directly; client stores a proposal the coach approves.
-- ============================================================

alter table public.training_sessions
  add column if not exists edit_proposed_at    timestamptz,
  add column if not exists edit_proposed_title text,
  add column if not exists edit_proposed_notes text,
  add column if not exists edit_requested_by   uuid references public.profiles(id) on delete set null;
