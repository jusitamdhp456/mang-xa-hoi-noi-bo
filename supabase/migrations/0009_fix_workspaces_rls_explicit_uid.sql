-- Drop old policies to prevent duplicate errors
drop policy if exists "members can read their workspaces" on public.workspaces;
drop policy if exists "members can read workspace members" on public.workspace_members;

-- Create select policy for workspaces with explicit auth.uid()
create policy "members can read their workspaces"
on public.workspaces for select to authenticated
using (public.is_workspace_member(id, auth.uid()));

-- Create select policy for workspace members with explicit auth.uid()
create policy "members can read workspace members"
on public.workspace_members for select to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));
