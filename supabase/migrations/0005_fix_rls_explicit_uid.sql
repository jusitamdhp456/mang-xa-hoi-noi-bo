-- Drop old policies to prevent duplicate errors
drop policy if exists "members can read channel categories" on public.channel_categories;
drop policy if exists "members can create channel categories" on public.channel_categories;
drop policy if exists "members can create channels" on public.channels;

-- Create select policy for channel categories
create policy "members can read channel categories"
on public.channel_categories for select to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

-- Create insert policy for channel categories
create policy "members can create channel categories"
on public.channel_categories for insert to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()));

-- Create insert policy for channels
create policy "members can create channels"
on public.channels for insert to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()));
