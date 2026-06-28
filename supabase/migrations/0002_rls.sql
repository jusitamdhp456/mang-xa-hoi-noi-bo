-- Helper functions
create or replace function public.is_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_user_id
  );
$$;

create or replace function public.workspace_role(
  p_workspace_id uuid,
  p_user_id uuid default auth.uid()
)
returns public.member_role
language sql
stable
security definer
set search_path = public
as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = p_workspace_id
    and wm.user_id = p_user_id
  limit 1;
$$;

create or replace function public.can_view_channel(
  p_channel_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.channels c
    where c.id = p_channel_id
      and public.is_workspace_member(c.workspace_id, p_user_id)
      and (
        c.is_private = false
        or exists (
          select 1
          from public.channel_members cm
          where cm.channel_id = c.id
            and cm.user_id = p_user_id
            and cm.can_read = true
        )
      )
  );
$$;

create or replace function public.can_write_channel(
  p_channel_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.channels c
    where c.id = p_channel_id
      and public.is_workspace_member(c.workspace_id, p_user_id)
      and (
        c.is_private = false
        or exists (
          select 1
          from public.channel_members cm
          where cm.channel_id = c.id
            and cm.user_id = p_user_id
            and cm.can_write = true
        )
      )
  );
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.channel_categories enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_reads enable row level security;
alter table public.direct_threads enable row level security;
alter table public.direct_thread_members enable row level security;
alter table public.direct_messages enable row level security;
alter table public.voice_sessions enable row level security;
alter table public.voice_participants enable row level security;
alter table public.media_rooms enable row level security;
alter table public.media_items enable row level security;
alter table public.media_queue enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Minimal RLS Policies

-- Profiles
create policy "profiles can read basic profiles"
on public.profiles for select to authenticated using (true);

create policy "users can update own profile"
on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy "users can insert own profile"
on public.profiles for insert to authenticated
with check (id = auth.uid());

-- Workspaces
create policy "members can read their workspaces"
on public.workspaces for select to authenticated
using (public.is_workspace_member(id));

create policy "users can create workspaces"
on public.workspaces for insert to authenticated
with check (true);

-- Workspace Members
create policy "members can read workspace members"
on public.workspace_members for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "users can join workspace"
on public.workspace_members for insert to authenticated
with check (user_id = auth.uid());

-- Channels
create policy "members can read visible channels"
on public.channels for select to authenticated
using (public.can_view_channel(id));

-- Messages
create policy "members can read messages in visible channels"
on public.messages for select to authenticated
using (public.can_view_channel(channel_id));

create policy "members can insert messages in writable channels"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.can_write_channel(channel_id)
);

create policy "sender can edit own messages"
on public.messages for update to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

create policy "sender can delete own messages"
on public.messages for delete to authenticated
using (sender_id = auth.uid());

-- Reactions
create policy "members can read reactions in visible channels"
on public.message_reactions for select to authenticated
using (
  exists (
    select 1 from public.messages m
    where m.id = message_id and public.can_view_channel(m.channel_id)
  )
);

create policy "members can react to visible messages"
on public.message_reactions for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.messages m
    where m.id = message_id and public.can_view_channel(m.channel_id)
  )
);

-- Notifications
create policy "users can read own notifications"
on public.notifications for select to authenticated
using (user_id = auth.uid());

create policy "users can delete own notifications"
on public.notifications for delete to authenticated
using (user_id = auth.uid());
