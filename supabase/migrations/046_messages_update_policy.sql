-- 046_messages_update_policy.sql
-- Allow recipients to mark messages as read (update read_at).
-- Without this policy markMessagesAsRead silently fails.
do $$ begin
  create policy "recipient_marks_read" on public.messages
    for update
    using (auth.uid() = to_user_id)
    with check (auth.uid() = to_user_id);
exception when duplicate_object then null;
end $$;
