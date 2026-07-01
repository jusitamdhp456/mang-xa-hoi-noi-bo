-- Đợt 11b — DB features: slow mode, announcement/NSFW channels, audit log,
-- blocked users, custom emojis. Safe to run multiple times (IF NOT EXISTS).
-- Writes are done from the app via the service client, so only SELECT policies
-- are added here.

-- 1) Channel flags -----------------------------------------------------------
alter table public.channels add column if not exists slowmode_seconds int not null default 0;
alter table public.channels add column if not exists is_announcement boolean not null default false;
alter table public.channels add column if not exists is_nsfw boolean not null default false;

-- 2) Blocked users -----------------------------------------------------------
create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocked_users enable row level security;

drop policy if exists blocked_users_select_own on public.blocked_users;
create policy blocked_users_select_own on public.blocked_users
  for select using (auth.uid() = blocker_id);

drop policy if exists blocked_users_insert_own on public.blocked_users;
create policy blocked_users_insert_own on public.blocked_users
  for insert with check (auth.uid() = blocker_id);

drop policy if exists blocked_users_delete_own on public.blocked_users;
create policy blocked_users_delete_own on public.blocked_users
  for delete using (auth.uid() = blocker_id);

-- 3) Custom emojis (per workspace) ------------------------------------------
create table if not exists public.custom_emojis (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  object_key text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);
alter table public.custom_emojis enable row level security;

drop policy if exists custom_emojis_select_member on public.custom_emojis;
create policy custom_emojis_select_member on public.custom_emojis
  for select using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = custom_emojis.workspace_id and m.user_id = auth.uid()
    )
  );

-- 4) Audit log (per workspace) ----------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_ws_idx on public.audit_logs (workspace_id, created_at desc);
alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin on public.audit_logs
  for select using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = audit_logs.workspace_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );
