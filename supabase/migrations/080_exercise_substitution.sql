-- Swapping one exercise for one session.
--
-- Machine bench and barbell bench are the same movement and not the same
-- number: the machine carries part of the load and the path is guided, so
-- merging their curves would draw a drop that never happened. Keeping them as
-- separate series is right — but then a day where the machine was used looks
-- like a day the exercise was skipped.
--
-- This records what the row stood in for. The substitute keeps its own history
-- under its own name, the planned exercise knows why it has a gap, and the next
-- session comes back to the programme without anyone changing the plan.
alter table public.exercise_logs
  add column if not exists replaces text;
