-- Custom soundboard sounds uploaded by members, shared per workspace.
-- Writes go through the service client; only a SELECT policy for members here.
create table if not exists public.custom_sounds (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  object_key text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.custom_sounds enable row level security;

drop policy if exists custom_sounds_select_member on public.custom_sounds;
create policy custom_sounds_select_member on public.custom_sounds
  for select using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = custom_sounds.workspace_id and m.user_id = auth.uid()
    )
  );
