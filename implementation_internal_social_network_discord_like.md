# Implementation chi tiết: Hệ thống mạng xã hội nội bộ kiểu Discord

> Mục tiêu: xây dựng một hệ thống mạng xã hội nội bộ cho công ty/đội nhóm, có nhiều tài khoản nội bộ, phân quyền theo không gian làm việc, chat realtime, gọi nội bộ, chia sẻ file, nghe nhạc chung, xem phim chung và các tính năng cộng đồng sáng tạo.

---

## 1. Tư duy sản phẩm

Hệ thống nên được thiết kế theo mô hình giống Discord nhưng tối ưu cho nội bộ doanh nghiệp:

- **Workspace / Server**: mỗi công ty, chi nhánh, phòng ban hoặc dự án là một không gian riêng.
- **Category**: nhóm kênh, ví dụ `Thông báo`, `Dự án`, `Kinh doanh`, `Media`, `Giải trí`, `Phòng họp`.
- **Channel**: kênh chat text, voice, announcement, media room, watch party.
- **Direct Message**: chat riêng 1-1 hoặc nhóm nhỏ.
- **Role & Permission**: owner, admin, mod, member, guest.
- **Realtime Presence**: online/offline, đang gõ, đang ở phòng nào, đang trong cuộc gọi nào.
- **Media Layer**: ảnh, video, file ghi âm lưu ở Cloudflare R2; metadata lưu ở Supabase.
- **Realtime Interaction**: chat, reaction, typing, call signaling, watch-party sync dùng Supabase Realtime.

---

## 2. Stack triển khai đề xuất

### 2.1 Frontend + Backend nhẹ

- **Next.js App Router + TypeScript**
- **Tailwind CSS + shadcn/ui** cho UI nhanh, sạch, dễ mở rộng.
- **TanStack Query** cho cache dữ liệu.
- **Zustand** cho state nhẹ: active channel, current workspace, call state, media room state.
- **Vercel** để deploy frontend, API routes, server actions, cron jobs.

### 2.2 Database, auth, realtime

- **Supabase Auth**: đăng nhập, session, user id.
- **Supabase Postgres**: lưu users/profile, workspace, channels, messages, metadata file, permission.
- **Supabase Row Level Security**: bắt buộc bật RLS cho dữ liệu nội bộ.
- **Supabase Realtime**:
  - Postgres Changes: cập nhật message, channel, notification.
  - Broadcast: typing, call signaling, watch party event.
  - Presence: online, đang xem channel, trạng thái trong phòng.

### 2.3 Storage media

- **Cloudflare R2**:
  - Lưu ảnh, video, voice note, avatar, file đính kèm.
  - Upload trực tiếp từ client bằng **presigned PUT URL** do server tạo.
  - File private mặc định; client xem/tải qua signed GET URL hoặc proxy endpoint.

### 2.4 Gọi nội bộ

Có 2 hướng:

#### Hướng MVP tiết kiệm

- Dùng **WebRTC P2P** cho gọi 1-1 hoặc nhóm rất nhỏ.
- Dùng Supabase Realtime Broadcast làm signaling: `offer`, `answer`, `ice-candidate`, `join`, `leave`.
- Phù hợp để chạy nhanh bản đầu.
- Hạn chế: gọi nhóm đông sẽ nặng, vì mỗi client phải gửi nhiều luồng media.

#### Hướng production khuyên dùng

- Dùng **Cloudflare RealtimeKit / Realtime SFU** hoặc **LiveKit** cho audio/video/screen share nhóm.
- Supabase vẫn lưu room, participant, lịch sử cuộc gọi.
- API route trên Vercel chỉ cấp token sau khi kiểm tra quyền.
- Đây là hướng nên dùng nếu cần gọi nhóm ổn định giống Discord/Zoom.

---

## 3. Scope tính năng

## 3.1 MVP bắt buộc

### A. Tài khoản nội bộ

- Đăng nhập bằng email/password hoặc magic link.
- Tạo profile sau lần đăng nhập đầu tiên.
- Avatar, display name, username, trạng thái cá nhân.
- Admin tạo lời mời tham gia workspace.

### B. Workspace / Server

- Tạo workspace.
- Mời thành viên bằng link invite hoặc email.
- Phân quyền owner/admin/mod/member/guest.
- Quản lý danh sách thành viên.

### C. Channel nội bộ

- Text channel.
- Announcement channel.
- Voice channel.
- Media room channel.
- Private channel chỉ một số role/member được thấy.

### D. Chat realtime

- Gửi tin nhắn text.
- Reply tin nhắn.
- Edit/delete tin nhắn.
- Reaction emoji.
- Typing indicator.
- Read receipt cơ bản.
- Pin tin nhắn.
- Upload ảnh/file/voice note qua R2.

### E. Gọi nội bộ

- Gọi 1-1.
- Voice channel: tham gia/rời phòng.
- Mute/unmute mic.
- Bật/tắt camera nếu triển khai video.
- Screen share ở phase sau hoặc production SFU.

### F. Nghe nhạc chung / xem phim chung

- Tạo media room.
- Host chọn file audio/video từ R2.
- Thành viên cùng phòng xem/nghe đồng bộ.
- Host có quyền play/pause/seek/next.
- Sync theo timestamp để tránh lệch.

> Lưu ý pháp lý: chỉ dùng nội dung công ty sở hữu, được cấp phép, hoặc file nội bộ. Không thiết kế tính năng để né DRM hoặc phát tán nội dung vi phạm bản quyền.

---

## 3.2 Tính năng cao cấp nên thêm

### 1. Internal Radio / Music Lounge

Một phòng nhạc nội bộ, admin hoặc DJ nội bộ xếp hàng bài hát. Có thể dùng trong giờ nghỉ, sự kiện nội bộ, team building.

### 2. Watch Party theo phòng ban

Phòng xem video đào tạo, video onboarding, clip nội bộ. Có chat cạnh video, reaction realtime, poll sau khi xem.

### 3. Focus Room

Phòng làm việc tập trung. Người dùng vào phòng, bật trạng thái `Đang tập trung`, hệ thống tắt notification không quan trọng.

### 4. Meeting Notes AI

Sau cuộc gọi hoặc voice note, hệ thống có thể tạo:

- Tóm tắt nội dung.
- Action items.
- Người phụ trách.
- Deadline.

Có thể triển khai sau bằng AI transcription/summarization.

### 5. Channel Task Board

Mỗi channel có tab `Tasks`:

- Tạo việc ngay từ tin nhắn.
- Assign người phụ trách.
- Deadline.
- Trạng thái: todo, doing, done.

### 6. Knowledge Base nội bộ

Tin nhắn quan trọng có thể lưu thành bài viết nội bộ:

- SOP.
- Quy trình.
- Hướng dẫn đào tạo.
- FAQ.

### 7. Poll / Vote / Decision Log

- Tạo bình chọn trong channel.
- Ghi lại quyết định cuối cùng.
- Dễ truy vết sau này.

### 8. Badge / Reputation

- Badge cho người hỗ trợ nhiều.
- Điểm đóng góp theo reaction, task hoàn thành, tài liệu hữu ích.
- Leaderboard nội bộ theo tháng.

### 9. Bot nội bộ

Bot có thể:

- Nhắc lịch họp.
- Nhắc deadline.
- Tóm tắt channel cuối ngày.
- Báo sinh nhật.
- Báo ai đang trực.
- Tìm nhanh SOP/quy trình.

### 10. Mood Check-in

Mỗi ngày nhân viên có thể check-in tâm trạng. Admin chỉ xem thống kê tổng quan, không nên lộ dữ liệu quá cá nhân.

---

## 4. Kiến trúc tổng thể

```txt
Client Browser
  |
  |-- Next.js App Router UI
  |-- Supabase Client: auth, realtime, read/write theo RLS
  |-- WebRTC client: call P2P hoặc SDK SFU
  |
Vercel
  |-- Server Actions / API Routes
  |-- Auth middleware
  |-- R2 presigned URL API
  |-- Call token API
  |-- Cron cleanup jobs
  |
Supabase
  |-- Auth
  |-- Postgres
  |-- RLS policies
  |-- Realtime Broadcast / Presence / Postgres Changes
  |
Cloudflare R2
  |-- avatars
  |-- message attachments
  |-- voice notes
  |-- internal video/audio
  |-- thumbnails
  |
Optional Production Call Layer
  |-- Cloudflare RealtimeKit / LiveKit SFU
```

---

## 5. Cấu trúc repository

```txt
internal-social/
  app/
    (auth)/
      login/page.tsx
      register/page.tsx
    (app)/
      layout.tsx
      workspace/[workspaceId]/page.tsx
      workspace/[workspaceId]/channel/[channelId]/page.tsx
      dm/[threadId]/page.tsx
    api/
      r2/presign/route.ts
      r2/sign-get/route.ts
      upload/complete/route.ts
      calls/token/route.ts
      cron/cleanup/route.ts
  components/
    auth/
    layout/
    workspace/
    channel/
    chat/
    call/
    media-room/
    members/
    admin/
    ui/
  features/
    auth/
    workspace/
    channels/
    chat/
    realtime/
    upload/
    calls/
    media-room/
    notifications/
    permissions/
  lib/
    supabase/
      client.ts
      server.ts
      middleware.ts
    r2/
      client.ts
      presign.ts
    permissions/
      checks.ts
    realtime/
      channels.ts
    utils/
  hooks/
    use-current-user.ts
    use-workspace.ts
    use-channel-messages.ts
    use-presence.ts
    use-typing.ts
    use-call-room.ts
    use-media-sync.ts
  supabase/
    migrations/
      0001_init.sql
      0002_rls.sql
      0003_realtime.sql
      0004_seed_dev.sql
  tests/
    unit/
    e2e/
  docs/
    architecture.md
    api.md
    rls.md
  AGENTS.md
  README.md
  package.json
  .env.example
```

---

## 6. Environment variables

Tạo `.env.example`:

```env
# Supabase public client
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase server only
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
R2_PUBLIC_BASE_URL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_CRON_SECRET=

# Optional production call provider
CALL_PROVIDER=p2p
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
CLOUDFLARE_REALTIME_APP_ID=
CLOUDFLARE_REALTIME_API_KEY=
```

Nguyên tắc:

- Biến bắt đầu bằng `NEXT_PUBLIC_` sẽ lộ ra browser, chỉ dùng cho dữ liệu public.
- Không bao giờ đưa `SUPABASE_SERVICE_ROLE_KEY`, R2 secret, API secret vào client component.
- API route/server action phải kiểm tra session trước khi tạo signed URL hoặc call token.

---

## 7. Database schema đề xuất

> Agent nên tạo migration theo từng file nhỏ, không nhồi toàn bộ vào một lần nếu khó debug.

### 7.1 Extensions + enums

```sql
create extension if not exists citext;
create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'admin', 'mod', 'member', 'guest');
create type public.channel_type as enum ('text', 'voice', 'stage', 'announcement', 'media');
create type public.message_type as enum ('text', 'system', 'voice_note', 'file', 'image', 'video');
create type public.call_status as enum ('active', 'ended', 'missed');
create type public.media_room_status as enum ('idle', 'playing', 'paused', 'ended');
```

### 7.2 Profiles

```sql
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
```

### 7.3 Workspace

```sql
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
```

### 7.4 Category + Channel

```sql
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
```

### 7.5 Messages

```sql
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
```

### 7.6 Direct messages

```sql
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
```

### 7.7 Call / Voice session

```sql
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
```

### 7.8 Media room / nghe nhạc chung / xem phim chung

```sql
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
```

### 7.9 Notification + audit

```sql
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
```

---

## 8. RLS policy nền tảng

### 8.1 Helper functions

```sql
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
```

### 8.2 Enable RLS

```sql
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
```

### 8.3 Policies mẫu

```sql
create policy "profiles can read basic profiles"
on public.profiles
for select
to authenticated
using (true);

create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "members can read their workspaces"
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id));

create policy "members can read workspace members"
on public.workspace_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "members can read visible channels"
on public.channels
for select
to authenticated
using (public.can_view_channel(id));

create policy "members can read messages in visible channels"
on public.messages
for select
to authenticated
using (public.can_view_channel(channel_id));

create policy "members can insert messages in writable channels"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.can_write_channel(channel_id)
);

create policy "sender can edit own messages"
on public.messages
for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

create policy "members can react to visible messages"
on public.message_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.messages m
    where m.id = message_id
      and public.can_view_channel(m.channel_id)
  )
);

create policy "users can read own notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());
```

---

## 9. Realtime design

### 9.1 Channel naming convention

```txt
workspace:{workspaceId}:presence
channel:{channelId}:messages
channel:{channelId}:typing
call:{sessionId}:signal
media-room:{roomId}:sync
dm:{threadId}:messages
dm:{threadId}:typing
```

### 9.2 Tin nhắn realtime

Luồng gửi tin nhắn:

```txt
Client submit message
  -> insert into public.messages
  -> Supabase Realtime Postgres Changes phát event INSERT
  -> clients đang ở channel nhận message
  -> optimistic UI reconcile theo temp id
```

Typing indicator không nên ghi DB:

```txt
Client đang gõ
  -> Supabase Realtime Broadcast: { type: 'typing_start', userId }
  -> sau 3 giây không gõ: { type: 'typing_stop', userId }
```

Presence:

```txt
Client vào workspace
  -> track presence { userId, displayName, activeChannelId, status, lastSeen }
Client chuyển channel
  -> update presence activeChannelId
Client rời app
  -> untrack hoặc tự timeout
```

---

## 10. Upload file qua Cloudflare R2

### 10.1 Luồng upload

```txt
1. Client chọn file
2. Client gọi /api/r2/presign với: workspaceId, channelId, fileName, mimeType, size
3. Server kiểm tra user có quyền gửi file vào channel không
4. Server tạo objectKey theo chuẩn
5. Server trả presigned PUT URL
6. Client upload trực tiếp lên R2
7. Client gọi /api/upload/complete để lưu metadata vào message_attachments
8. Message hiện trong channel
```

### 10.2 Object key convention

```txt
workspaces/{workspaceId}/channels/{channelId}/{yyyy}/{mm}/{messageId}/{uuid}-{safeFileName}
workspaces/{workspaceId}/avatars/{userId}/{uuid}.webp
workspaces/{workspaceId}/media-room/{mediaItemId}/{uuid}-{safeFileName}
```

### 10.3 API route presign mẫu

```ts
// app/api/r2/presign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '@/lib/r2/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canWriteChannel } from '@/lib/permissions/checks';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { workspaceId, channelId, fileName, mimeType, sizeBytes } = body;

  if (!workspaceId || !channelId || !fileName || !mimeType || !sizeBytes) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const allowed = await canWriteChannel(supabase, channelId, user.id);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectKey = `workspaces/${workspaceId}/channels/${channelId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: objectKey,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 60 * 5 });

  return NextResponse.json({ uploadUrl, objectKey });
}
```

### 10.4 R2 client mẫu

```ts
// lib/r2/client.ts
import { S3Client } from '@aws-sdk/client-s3';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

---

## 11. Chat implementation chi tiết

### 11.1 Components

```txt
ChatShell
  ChannelHeader
  MessageList
    MessageItem
    ReactionBar
    AttachmentPreview
    ReplyPreview
  TypingIndicator
  MessageComposer
    FileUploadButton
    VoiceNoteRecorder
    EmojiPicker
```

### 11.2 Hook đọc tin nhắn

```ts
useChannelMessages(channelId)
  - fetch messages page đầu theo created_at desc
  - subscribe Postgres Changes INSERT/UPDATE/DELETE
  - merge realtime event vào cache
  - expose loadMore()
```

### 11.3 Optimistic message

Khi user gửi tin:

```txt
1. Tạo temp message id ở client.
2. Hiển thị ngay trạng thái sending.
3. Insert DB.
4. Khi realtime trả message thật, replace temp id.
5. Nếu lỗi, chuyển trạng thái failed và cho retry.
```

### 11.4 Voice note

```txt
1. Dùng MediaRecorder API ghi âm.
2. Sau khi stop, tạo file audio/webm.
3. Upload R2 qua presigned URL.
4. Insert message type = voice_note.
5. Lưu duration_seconds vào message_attachments.
```

---

## 12. Gọi nội bộ implementation

## 12.1 MVP WebRTC P2P

### 12.1.1 Luồng gọi 1-1

```txt
Caller bấm gọi
  -> tạo voice_sessions row
  -> tạo voice_participants caller
  -> gửi notification/call_invite cho callee
  -> caller join realtime channel call:{sessionId}:signal

Callee nhận lời
  -> tạo voice_participants callee
  -> join realtime channel call:{sessionId}:signal
  -> trao đổi WebRTC offer/answer/candidate
  -> media stream kết nối trực tiếp P2P
```

### 12.1.2 Broadcast events

```ts
type CallSignalEvent =
  | { type: 'join'; userId: string }
  | { type: 'leave'; userId: string }
  | { type: 'offer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; from: string; to: string; candidate: RTCIceCandidateInit }
  | { type: 'mute'; userId: string; muted: boolean }
  | { type: 'camera'; userId: string; cameraOn: boolean }
  | { type: 'screen-share'; userId: string; active: boolean };
```

### 12.1.3 Hook call

```ts
useP2PCall(sessionId)
  - get local audio/video stream
  - join Supabase broadcast channel
  - maintain peerConnections map by userId
  - create offer for new participant
  - handle answer
  - handle ICE candidate
  - expose mute(), toggleCamera(), shareScreen(), leave()
```

### 12.1.4 Giới hạn MVP

- Gọi 1-1 ổn.
- Gọi nhóm P2P chỉ nên giới hạn 3-4 người.
- Nếu cần phòng voice đông người, phải chuyển sang SFU.

## 12.2 Production call bằng SFU

### 12.2.1 Luồng

```txt
Client vào voice channel
  -> gọi /api/calls/token
  -> server kiểm tra user thuộc workspace/channel
  -> server tạo token SFU
  -> client connect SDK
  -> Supabase lưu voice_participants để UI biết ai đang trong phòng
```

### 12.2.2 API route token

```ts
// app/api/calls/token/route.ts
export async function POST(req: Request) {
  // 1. verify Supabase session
  // 2. verify user can_view_channel(channelId)
  // 3. create or reuse voice_sessions
  // 4. issue provider token: Cloudflare RealtimeKit or LiveKit
  // 5. upsert voice_participants
  // 6. return { token, roomName, sessionId }
}
```

### 12.2.3 Nên hỗ trợ

- Voice call.
- Video call.
- Screen share.
- Stage room: chỉ speaker được nói, member nghe.
- Moderator kick/mute.
- Recording nếu có nhu cầu, file lưu R2 sau khi xong.

---

## 13. Nghe nhạc chung / xem phim chung implementation

## 13.1 Mô hình đồng bộ

Không stream một lần từ server cho tất cả user. Mỗi client tự phát cùng một file R2 signed URL, hệ thống chỉ đồng bộ trạng thái.

State chính:

```ts
type MediaRoomState = {
  roomId: string;
  currentItemId: string | null;
  status: 'idle' | 'playing' | 'paused' | 'ended';
  positionMs: number;
  playbackRate: number;
  startedAt: string | null;
  hostId: string;
};
```

### 13.2 Event sync

```ts
type MediaSyncEvent =
  | { type: 'play'; positionMs: number; serverTime: string }
  | { type: 'pause'; positionMs: number; serverTime: string }
  | { type: 'seek'; positionMs: number; serverTime: string }
  | { type: 'next'; itemId: string; positionMs: 0; serverTime: string }
  | { type: 'sync-request'; from: string }
  | { type: 'sync-state'; state: MediaRoomState };
```

### 13.3 Cách tính vị trí khi đang phát

```ts
function computeCurrentPositionMs(state: MediaRoomState, now: number) {
  if (state.status !== 'playing' || !state.startedAt) return state.positionMs;
  const elapsed = now - new Date(state.startedAt).getTime();
  return state.positionMs + elapsed * Number(state.playbackRate || 1);
}
```

### 13.4 UI

```txt
MediaRoomPage
  VideoPlayer / AudioPlayer
  QueuePanel
  ChatSidePanel
  ParticipantList
  HostControls
  ReactionOverlay
```

### 13.5 Quyền điều khiển

- Host được play/pause/seek/next.
- Admin/mod có thể lấy quyền host.
- Member thường chỉ xem/nghe và reaction.
- Có thể bật chế độ democratic: mọi người vote bài tiếp theo.

---

## 14. Notification

### 14.1 In-app notification

Tạo bảng `notifications`, dùng Supabase Realtime để cập nhật số badge.

Trigger nên tạo notification khi:

- Mention `@username`.
- Reply tin nhắn của user.
- Có lời mời gọi.
- Được add vào workspace/channel.
- Task được assign.

### 14.2 Browser push notification

Có thể thêm sau bằng Web Push:

- Lưu subscription endpoint vào DB.
- Vercel API route gửi push.
- User tự bật/tắt theo workspace/channel.

---

## 15. Permission model

### 15.1 Role mặc định

```txt
owner
  - toàn quyền workspace
admin
  - quản lý channel/member, không xóa owner
mod
  - quản lý message, mute/kick trong voice
member
  - chat/call/upload theo quyền channel
guest
  - chỉ thấy channel được cấp quyền
```

### 15.2 Permission flags nên có ở phase 2

```txt
workspace.manage
member.invite
member.kick
channel.create
channel.update
channel.delete
message.send
message.delete_any
message.pin
file.upload
voice.join
voice.mute_others
media_room.control
announcement.send
```

Ở MVP có thể dùng enum role đơn giản. Khi hệ thống lớn, tách bảng:

```txt
roles
permissions
role_permissions
member_roles
channel_role_overrides
```

---

## 16. Admin dashboard

Admin cần có:

- Danh sách workspace.
- Danh sách thành viên.
- Mời/xóa/khóa thành viên.
- Tạo/sửa/xóa channel.
- Xem audit logs.
- Quản lý file media dung lượng lớn.
- Cấu hình retention tin nhắn/file.
- Report message/user.
- Dashboard hoạt động:
  - số tin nhắn/ngày;
  - số user active;
  - tổng dung lượng R2;
  - số cuộc gọi;
  - channel hoạt động nhiều nhất.

---

## 17. Vercel Cron Jobs

Dùng cron cho các việc nền nhẹ:

```txt
/api/cron/cleanup
  - xóa upload dangling chưa gắn message sau 24h
  - kết thúc voice_sessions bị treo
  - cập nhật daily activity summary
  - tạo digest notification cuối ngày
```

`vercel.json` mẫu:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 18 * * *"
    }
  ]
}
```

API cron phải kiểm tra secret:

```ts
const authHeader = req.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.APP_CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## 18. Search

MVP:

- Search message bằng Postgres `ilike`.
- Index `created_at`, `channel_id`.

Phase 2:

- Dùng Postgres full-text search.
- Tìm theo channel, người gửi, thời gian, file type.

Phase 3:

- Semantic search cho knowledge base nội bộ.

---

## 19. Bảo mật bắt buộc

- Bật RLS toàn bộ table public.
- Không dùng service role ở client.
- Mọi API route phải verify session.
- Signed URL R2 có hạn ngắn.
- Validate mime type và size trước khi presign.
- Không cho upload file nguy hiểm nếu không cần: `.exe`, `.sh`, `.bat`, `.cmd`.
- Rate limit API gửi tin nhắn/upload/call invite.
- Audit log các hành động admin.
- Soft delete message bằng `deleted_at`, không xóa cứng ngay.
- Không lưu mật khẩu ngoài Supabase Auth.
- Không log token, signed URL, service key.
- Tách quyền xem file theo quyền xem message/channel.

---

## 20. Roadmap triển khai cho Antigravity Code Agent

## Phase 0 — Khởi tạo dự án

### Mục tiêu

Tạo Next.js app, cấu trúc thư mục, Supabase client, R2 client, UI base.

### Prompt cho agent

```txt
You are building an internal Discord-like social network using Next.js App Router, TypeScript, Supabase, Cloudflare R2, and Vercel.

Task Phase 0:
1. Initialize the project structure exactly as described in docs/implementation_internal_social_network_discord_like.md.
2. Add Tailwind CSS and shadcn/ui.
3. Create lib/supabase/client.ts, lib/supabase/server.ts, lib/r2/client.ts.
4. Create .env.example with all required variables.
5. Create placeholder pages: login, register, workspace page, channel page.
6. Do not implement business logic yet.
7. Run typecheck and lint.
8. Commit as: chore: initialize internal social network app.

Acceptance criteria:
- npm run dev starts successfully.
- TypeScript has no errors.
- No secret key is referenced in client components.
```

---

## Phase 1 — Supabase schema + RLS

### Mục tiêu

Tạo database migration đầy đủ cho profile, workspace, channel, messages, call, media room.

### Prompt cho agent

```txt
Task Phase 1:
Create Supabase migrations for the internal social network.

Requirements:
1. Add extensions citext and pgcrypto.
2. Add enums: member_role, channel_type, message_type, call_status, media_room_status.
3. Add tables: profiles, workspaces, workspace_members, channel_categories, channels, channel_members, messages, message_attachments, message_reactions, message_reads, pinned_messages, direct_threads, direct_thread_members, direct_messages, voice_sessions, voice_participants, media_rooms, media_items, media_queue, notifications, audit_logs.
4. Enable RLS on every table.
5. Add helper functions: is_workspace_member, workspace_role, can_view_channel, can_write_channel.
6. Add minimal RLS policies for profiles, workspaces, workspace_members, channels, messages, reactions, notifications.
7. Create indexes for message pagination and workspace lookup.
8. Add seed data for local development only.
9. Do not weaken RLS to make tests pass.

Acceptance criteria:
- Supabase migration applies cleanly.
- Authenticated user can only read workspaces where they are member.
- User can only insert message into channel they can write.
```

---

## Phase 2 — Auth + onboarding

### Mục tiêu

Đăng nhập, tạo profile, vào workspace đầu tiên.

### Prompt cho agent

```txt
Task Phase 2:
Implement Supabase Auth and onboarding.

Requirements:
1. Implement login and register pages.
2. Configure Supabase SSR client using cookies.
3. Add middleware to protect app routes.
4. After first login, create profile row if missing.
5. Build onboarding UI to create first workspace.
6. When creating workspace, insert workspace and workspace_members owner row in a transaction or RPC.
7. Add basic AppShell with sidebar.

Acceptance criteria:
- User can register/login/logout.
- User can create a workspace.
- User sees only their workspace.
- Protected routes redirect unauthenticated users to login.
```

---

## Phase 3 — Workspace + channel management

### Mục tiêu

Tạo UI giống Discord cơ bản: sidebar server, category, channel, member list.

### Prompt cho agent

```txt
Task Phase 3:
Implement workspace and channel management.

Requirements:
1. Build WorkspaceSidebar, ChannelSidebar, MemberList.
2. List categories and channels ordered by sort_order.
3. Allow owner/admin to create text, voice, announcement, media channels.
4. Allow owner/admin to create categories.
5. Implement private channel visibility using channel_members and can_view_channel.
6. Add channel header with topic.
7. Add empty states.

Acceptance criteria:
- Member sees public channels in their workspace.
- Member sees private channel only if added.
- Owner/admin can create channels.
- Non-admin cannot create channels.
```

---

## Phase 4 — Chat realtime

### Mục tiêu

Gửi/nhận tin nhắn realtime, reaction, reply, typing.

### Prompt cho agent

```txt
Task Phase 4:
Implement realtime channel chat.

Requirements:
1. Create MessageList and MessageComposer.
2. Load latest 50 messages by channel_id and created_at desc.
3. Add pagination loadMore for older messages.
4. Insert messages with optimistic UI.
5. Subscribe to Supabase Realtime Postgres Changes for messages in current channel.
6. Add edit/delete own message.
7. Add reply_to_id display.
8. Add emoji reactions.
9. Add typing indicator using Supabase Broadcast, not database writes.
10. Update message_reads when user views channel.

Acceptance criteria:
- Two browsers in same channel see new messages in realtime.
- Typing indicator appears and disappears.
- RLS prevents sending to unauthorized private channel.
```

---

## Phase 5 — Upload file / image / voice note qua R2

### Mục tiêu

Upload file an toàn, lưu metadata Supabase, preview trong chat.

### Prompt cho agent

```txt
Task Phase 5:
Implement Cloudflare R2 uploads for chat attachments.

Requirements:
1. Implement /api/r2/presign for PUT upload.
2. Verify Supabase session server-side.
3. Check can_write_channel before creating presigned URL.
4. Validate file size and mime type.
5. Upload directly from browser to R2 using presigned URL.
6. Implement /api/upload/complete to create message and message_attachments metadata.
7. Add image preview, video preview, file download UI.
8. Add voice note recording using MediaRecorder and upload as voice_note.
9. Add R2 CORS instructions to docs.

Acceptance criteria:
- User can upload image/file to allowed channel.
- User cannot upload to unauthorized channel.
- No R2 secret is exposed to browser.
- Attachment metadata is stored in Supabase.
```

---

## Phase 6 — MVP internal call

### Mục tiêu

Gọi 1-1 và voice room nhỏ bằng WebRTC P2P.

### Prompt cho agent

```txt
Task Phase 6:
Implement MVP WebRTC P2P internal calls.

Requirements:
1. Add voice_sessions and voice_participants integration.
2. Implement call signaling with Supabase Broadcast channel call:{sessionId}:signal.
3. Implement useP2PCall hook using RTCPeerConnection.
4. Support join, leave, offer, answer, ice-candidate events.
5. Support mute/unmute.
6. Add simple CallPanel UI.
7. Add voice channel join/leave UI.
8. Limit group P2P rooms to max 4 users and show warning.

Acceptance criteria:
- Two users can join the same voice session and hear each other.
- Muting updates local track and UI.
- Leaving cleans up peer connections and voice_participants.left_at.
```

---

## Phase 7 — Production call provider adapter

### Mục tiêu

Chuẩn bị abstraction để sau này thay P2P bằng Cloudflare RealtimeKit hoặc LiveKit.

### Prompt cho agent

```txt
Task Phase 7:
Create a call provider adapter architecture.

Requirements:
1. Create features/calls/providers with interfaces: createRoomToken, joinRoom, leaveRoom.
2. Implement p2p provider as current default.
3. Add placeholder provider for livekit/cloudflare-realtime behind CALL_PROVIDER env.
4. Implement /api/calls/token to verify membership and return provider token.
5. Do not hardcode provider secrets in client.
6. Document how to switch CALL_PROVIDER.

Acceptance criteria:
- Existing P2P call still works.
- Provider can be switched by env without rewriting UI.
```

---

## Phase 8 — Media room / nghe nhạc chung / xem phim chung

### Mục tiêu

Tạo phòng đồng bộ phát audio/video nội bộ.

### Prompt cho agent

```txt
Task Phase 8:
Implement shared music and watch party media rooms.

Requirements:
1. Build media room page for channel type media.
2. Allow host/admin to upload or select media_items from R2 metadata.
3. Implement media_queue.
4. Implement AudioPlayer/VideoPlayer with host controls.
5. Use Supabase Broadcast media-room:{roomId}:sync for play, pause, seek, next, sync-state.
6. Store canonical room state in media_rooms.
7. Members joining late should request sync-state and jump to current position.
8. Add chat side panel.
9. Add reactions overlay.
10. Add copyright warning in UI when uploading media.

Acceptance criteria:
- Host play/pause/seek syncs to other clients.
- Late joiner starts near the current playback position.
- Non-host cannot control unless admin/mod.
```

---

## Phase 9 — Notifications + admin + moderation

### Mục tiêu

Hoàn thiện vận hành nội bộ.

### Prompt cho agent

```txt
Task Phase 9:
Implement notifications, admin dashboard, and moderation.

Requirements:
1. Add in-app notifications list and unread badge.
2. Create notification when user is mentioned or receives call invite.
3. Build admin dashboard for workspace members, channels, audit logs.
4. Allow admin/mod to soft-delete inappropriate messages.
5. Add audit_logs writes for admin actions.
6. Add basic rate limiting for message send and upload presign.
7. Add report message feature.

Acceptance criteria:
- Mention creates notification.
- Admin can manage members/channels.
- Moderation action is written to audit_logs.
```

---

## Phase 10 — Testing, deploy, observability

### Mục tiêu

Sẵn sàng chạy thật.

### Prompt cho agent

```txt
Task Phase 10:
Prepare production deployment on Vercel.

Requirements:
1. Add unit tests for permission helpers.
2. Add Playwright e2e tests for login, create workspace, send message.
3. Add docs for Supabase migration deployment.
4. Add docs for R2 CORS and bucket setup.
5. Add Vercel env setup checklist.
6. Add /api/health endpoint.
7. Add Vercel cron cleanup job with APP_CRON_SECRET.
8. Ensure build passes.

Acceptance criteria:
- npm run build passes.
- e2e basic flow passes locally.
- README has deploy checklist.
```

---

## 21. AGENTS.md đề xuất

Tạo file `AGENTS.md` ở root repo để Antigravity/Code Agent đọc trước khi code.

```md
# AGENTS.md

## Project

Build an internal Discord-like social network for company teams.

Stack:
- Next.js App Router
- TypeScript
- Supabase Auth, Postgres, Realtime, RLS
- Cloudflare R2 for object storage
- Vercel deployment
- Optional call provider: P2P WebRTC for MVP, Cloudflare RealtimeKit or LiveKit for production

## Non-negotiable rules

1. Never expose server secrets to the browser.
2. Never use SUPABASE_SERVICE_ROLE_KEY in client code.
3. All public tables must have RLS enabled.
4. Do not bypass RLS to make UI work.
5. Every API route must verify Supabase session unless explicitly public.
6. Every upload presign request must check channel permission.
7. Prefer small, reviewable commits.
8. Add migration files for DB changes; do not manually modify database without migration.
9. Use TypeScript strict types.
10. Do not introduce a paid provider unless it is behind an adapter and env flag.

## Coding conventions

- Use server components by default.
- Use client components only for interactive UI.
- Put Supabase browser client in lib/supabase/client.ts.
- Put Supabase server client in lib/supabase/server.ts.
- Put R2 client in lib/r2/client.ts.
- Put business logic under features/*.
- Keep UI components under components/*.

## Verification before finishing a task

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

If a command fails, fix it before marking task complete.

## Security checks

Before completing any task, search for accidental secret exposure:

```bash
grep -R "SERVICE_ROLE\|SECRET_ACCESS_KEY\|API_SECRET" app components features lib --exclude-dir=node_modules
```

Secrets may only appear in server-only files or env examples.
```

---

## 22. UI layout gợi ý

```txt
┌──────────────────────────────────────────────────────────────┐
│ Top bar: workspace name / search / notifications / profile   │
├───────┬──────────────────────┬─────────────────────┬─────────┤
│ Server│ Channel sidebar      │ Main content         │ Members │
│ icons │ - categories         │ - chat/media/call    │ online  │
│       │ - text channels      │ - composer           │ list    │
│       │ - voice channels     │                     │         │
└───────┴──────────────────────┴─────────────────────┴─────────┘
```

Mobile:

- Bottom nav: Servers, Channels, Chat, Members, Profile.
- Sidebar chuyển thành drawer.
- Chat composer cố định dưới màn hình.

---

## 23. Checklist deploy

### Supabase

- Tạo project.
- Chạy migrations.
- Bật email auth/magic link theo nhu cầu.
- Cấu hình URL redirect về Vercel domain.
- Kiểm tra RLS policies.
- Bật Realtime cho các table cần Postgres Changes.

### Cloudflare R2

- Tạo bucket private.
- Tạo API token/access key.
- Cấu hình CORS cho domain Vercel.
- Không public toàn bộ bucket nếu file nội bộ cần bảo mật.
- Dùng signed GET URL cho file private.

### Vercel

- Import GitHub repo.
- Thêm environment variables.
- Deploy preview branch.
- Kiểm tra auth redirect.
- Kiểm tra upload R2.
- Kiểm tra realtime chat.
- Kiểm tra cron secret.

### GitHub

- Branch chính: `main`.
- Branch phát triển: `dev`.
- Feature branch: `feature/chat-realtime`, `feature/r2-upload`, `feature/calls`.
- Bật pull request review.
- Không commit `.env.local`.

---

## 24. Definition of Done toàn hệ thống

MVP được coi là xong khi:

- User đăng ký/đăng nhập được.
- User tạo workspace được.
- Owner mời member được.
- Member thấy đúng workspace/channel theo quyền.
- Chat realtime hoạt động ở nhiều trình duyệt.
- Upload ảnh/file/voice note lên R2 được.
- Gọi 1-1 hoạt động bằng WebRTC P2P.
- Media room sync play/pause/seek giữa 2 client.
- RLS chặn truy cập trái phép.
- Deploy Vercel thành công.
- Không lộ secret ở client bundle.
- Có README hướng dẫn setup local và production.

---

## 25. Thứ tự ưu tiên nên làm

Không nên làm gọi nhóm, xem phim chung, AI summary ngay từ đầu. Thứ tự tối ưu:

1. Auth + workspace.
2. Channel + permission.
3. Chat realtime.
4. Upload R2.
5. Voice note.
6. Gọi 1-1.
7. Media room sync.
8. Admin/moderation.
9. Production SFU.
10. AI/bot/knowledge base.

---

## 26. Ghi chú quan trọng cho kiến trúc

- Supabase phù hợp cho auth, database, realtime events, presence.
- R2 phù hợp lưu file lớn, nhưng không nên dùng làm database metadata.
- Vercel phù hợp API nhẹ, presign URL, token generation, cron; không phù hợp làm media server lâu dài.
- WebRTC P2P phù hợp MVP; gọi nhóm production cần SFU.
- Watch party nên sync state, không relay video qua Vercel.
- Mọi quyền truy cập nên được enforce ở DB bằng RLS, không chỉ ẩn UI.

---

## 27. Tóm tắt cho Code Agent

```txt
Build a Discord-like internal social network.

Core stack:
- Next.js App Router + TypeScript on Vercel
- Supabase Auth/Postgres/Realtime/RLS
- Cloudflare R2 for media object storage
- WebRTC P2P for MVP calls, provider adapter for production SFU

Core modules:
1. Auth/profile
2. Workspace/server
3. Role/permission
4. Channels/categories
5. Realtime chat
6. Attachments and voice notes via R2
7. Direct messages
8. Voice/video calls
9. Music/watch party rooms
10. Notifications/admin/moderation

Build order:
Auth -> Workspace -> Channels -> Chat -> R2 upload -> Calls -> Media rooms -> Admin -> Tests -> Deploy.

Security:
RLS first, no client secrets, presigned uploads only after permission check, private R2 bucket, server-side session verification.
```
