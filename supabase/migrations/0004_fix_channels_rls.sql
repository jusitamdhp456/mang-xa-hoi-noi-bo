-- Cho phép thành viên đọc danh mục của workspace
create policy "members can read channel categories"
on public.channel_categories for select to authenticated
using (public.is_workspace_member(workspace_id));

-- Cho phép thành viên tạo danh mục
create policy "members can create channel categories"
on public.channel_categories for insert to authenticated
with check (public.is_workspace_member(workspace_id));

-- Cho phép thành viên tạo kênh mới
create policy "members can create channels"
on public.channels for insert to authenticated
with check (public.is_workspace_member(workspace_id));
