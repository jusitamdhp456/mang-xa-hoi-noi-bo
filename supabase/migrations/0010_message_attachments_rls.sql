-- Thêm policy cho phép đọc file đính kèm (message_attachments)
-- User chỉ được xem file đính kèm nếu họ có quyền xem channel chứa tin nhắn đó.

create policy "members can read attachments in visible channels"
on public.message_attachments for select to authenticated
using (
  exists (
    select 1 from public.messages m
    where m.id = message_id and public.can_view_channel(m.channel_id)
  )
);
