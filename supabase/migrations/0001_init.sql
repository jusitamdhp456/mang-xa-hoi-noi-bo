create extension if not exists citext;
create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'admin', 'mod', 'member', 'guest');
create type public.channel_type as enum ('text', 'voice', 'stage', 'announcement', 'media');
create type public.message_type as enum ('text', 'system', 'voice_note', 'file', 'image', 'video');
create type public.call_status as enum ('active', 'ended', 'missed');
create type public.media_room_status as enum ('idle', 'playing', 'paused', 'ended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique,
  display_name text not null,
  avatar_key text,
  status_text text,
  timezone text default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext unique not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  icon_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  nickname text,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.channel_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid references public.channel_categories(id) on delete set null,
  name citext not null,
  type public.channel_type not null default 'text',
  topic text,
  is_private boolean not null default false,
  sort_order int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  can_read boolean not null default true,
  can_write boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  type public.message_type not null default 'text',
  content text,
  reply_to_id uuid references public.messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_channel_created_idx on public.messages(channel_id, created_at desc);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  object_key text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  width int,
  height int,
  duration_seconds int,
  created_at timestamptz not null default now()
);

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table public.message_reads (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_message_id uuid references public.messages(id) on delete set null,
  read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table public.pinned_messages (
  channel_id uuid not null references public.channels(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  pinned_by uuid references public.profiles(id) on delete set null,
  pinned_at timestamptz not null default now(),
  primary key (channel_id, message_id)
);

create table public.direct_threads (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  title text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.direct_thread_members (
  thread_id uuid not null references public.direct_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.direct_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  type public.message_type not null default 'text',
  reply_to_id uuid references public.direct_messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete set null,
  dm_thread_id uuid references public.direct_threads(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  provider text not null default 'p2p',
  provider_room_name text,
  status public.call_status not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.voice_participants (
  session_id uuid not null references public.voice_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  muted boolean not null default false,
  deafened boolean not null default false,
  camera_on boolean not null default false,
  screen_sharing boolean not null default false,
  primary key (session_id, user_id)
);

create table public.media_rooms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete set null,
  host_id uuid references public.profiles(id) on delete set null,
  title text not null,
  status public.media_room_status not null default 'idle',
  current_item_id uuid,
  position_ms int not null default 0,
  playback_rate numeric not null default 1,
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  object_key text not null,
  title text not null,
  mime_type text not null,
  duration_seconds int,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.media_queue (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.media_rooms(id) on delete cascade,
  item_id uuid not null references public.media_items(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
